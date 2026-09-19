/**
 * NodePeeker Bridge Service — Sandbox integration.
 *
 * Runs inside the Figma plugin sandbox alongside NodePeeker's core inspector.
 * Feeds design context directly to Cursor and pi.dev via the local MCP broker (localhost:3939).
 *
 * Reuses `extractNodeData` directly so UI and AI agents always see identical data.
 */

import { extractNodeData } from './extractors';
import type { BridgeStatus, BridgeStatePayload, NodeInspectionData } from '../types/messages';
import type { CommandResult, PluginCommand, PluginHello, SelectionPush } from '../../bridge/protocol';
import { POLL_INTERVAL_MS } from '../../bridge/protocol';

const BROKER = 'http://localhost:3939';
const TOKEN_KEY = 'nodepeeker.bridge.token';
const ENABLED_KEY = 'nodepeeker.bridge.enabled';
const HELLO_INTERVAL_MS = 2_000;

let token: string | null = null;
let enabled = true;
let seq = 0;
let connected = false;
let lastError: string | null = null;
let consecutiveFailures = 0;
let isPolling = false;

let helloTimer: ReturnType<typeof setInterval> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

// ---- transport --------------------------------------------------------------

const headers = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  'X-Bridge-Token': token ?? '',
});

async function post(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${BROKER}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

async function get(path: string): Promise<unknown> {
  const res = await fetch(`${BROKER}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

// ---- UI notification --------------------------------------------------------

function notifyUi(state: BridgeStatus, detail?: string | null): void {
  try {
    figma.ui.postMessage({
      type: 'BRIDGE_STATUS',
      payload: {
        state,
        detail: detail ?? null,
        seq,
        enabled,
      },
    });
  } catch {
    // UI might not be listening yet
  }
}

// ---- broker lifecycle -------------------------------------------------------

async function hello(): Promise<boolean> {
  if (!enabled || !token) return false;

  const payload: PluginHello = {
    fileName: figma.root?.name ?? 'Untitled',
    fileKey: typeof figma.fileKey === 'string' ? figma.fileKey : null,
    capabilities: ['node', 'selection'],
  };

  try {
    await post('/hello', payload);
    if (!connected) {
      connected = true;
      consecutiveFailures = 0;
      lastError = null;
      notifyUi('connected');
      figma.notify?.('NodePeeker Bridge connected');
      void poll();
    }
    return true;
  } catch (err: unknown) {
    if (connected) {
      figma.notify?.('NodePeeker Bridge disconnected');
    }
    connected = false;
    lastError = err instanceof Error ? err.message : 'unknown error';
    notifyUi('disconnected', lastError);
    return false;
  }
}

// ---- subtree extraction for MCP GET_NODE ------------------------------------

interface TreeNode extends NodeInspectionData {
  children?: TreeNode[];
  vectorPaths?: { windingRule: string; data: string }[];
}

const GET_NODE_DEFAULT_DEPTH = 2;
const TREE_NODE_CAP = 200;

async function extractTree(
  node: SceneNode,
  depth: number,
  budget: { left: number }
): Promise<TreeNode> {
  const data = (await extractNodeData(node)) as TreeNode;

  if (node.type === 'VECTOR' && 'vectorPaths' in node && Array.isArray(node.vectorPaths)) {
    data.vectorPaths = node.vectorPaths.map((p) => ({
      windingRule: p.windingRule,
      data: p.data,
    }));
  }

  if (depth <= 0 || budget.left <= 0) return data;
  if (!('children' in node) || !Array.isArray(node.children) || node.children.length === 0) {
    return data;
  }

  const kids: TreeNode[] = [];
  for (const child of node.children) {
    if (budget.left <= 0) break;
    budget.left -= 1;
    kids.push(await extractTree(child as SceneNode, depth - 1, budget));
  }
  if (kids.length > 0) data.children = kids;
  return data;
}

// ---- command execution ------------------------------------------------------

async function execute(command: PluginCommand): Promise<CommandResult> {
  try {
    switch (command.type) {
      case 'GET_SELECTION': {
        const selection = figma.currentPage.selection;
        if (selection.length !== 1) {
          return {
            id: command.id,
            ok: false,
            error: { code: 'NO_SELECTION', message: `${selection.length} layers selected` },
          };
        }
        const data: NodeInspectionData = await extractNodeData(selection[0]);
        return { id: command.id, ok: true, data };
      }

      case 'GET_NODE': {
        const nodeId = String(command.params.nodeId ?? '');
        const node = nodeId
          ? (figma.getNodeById(nodeId) ?? figma.getNodeById(nodeId.replace(/-/g, ':')))
          : null;
        if (!node) {
          return {
            id: command.id,
            ok: false,
            error: { code: 'NODE_NOT_FOUND', message: `${nodeId} is not in this file` },
          };
        }
        const budget = { left: TREE_NODE_CAP };
        const depth = Math.max(
          0,
          Math.min(6, Number(command.params.depth ?? GET_NODE_DEFAULT_DEPTH))
        );
        const data =
          depth > 0
            ? await extractTree(node as SceneNode, depth, budget)
            : await extractNodeData(node as SceneNode);

        return {
          id: command.id,
          ok: true,
          data: budget.left <= 0 ? { ...data, truncated: true } : data,
        };
      }
    }
  } catch (err: unknown) {
    return {
      id: command.id,
      ok: false,
      error: { code: 'INTERNAL', message: err instanceof Error ? err.message : 'command failed' },
    };
  }
}

async function poll(): Promise<void> {
  if (!enabled || !connected || !token || isPolling) return;
  isPolling = true;
  try {
    const commands = (await get('/commands')) as PluginCommand[];
    consecutiveFailures = 0;
    for (const command of commands) {
      const result = await execute(command);
      await post('/result', result);
    }
  } catch {
    consecutiveFailures++;
    if (consecutiveFailures >= 3) {
      connected = false;
      notifyUi('disconnected', 'poll failed');
    }
  } finally {
    isPolling = false;
  }
}

// ---- timer loops ------------------------------------------------------------

function startLoops(): void {
  if (typeof setInterval !== 'function') return;
  if (helloTimer || pollTimer) return;

  helloTimer = setInterval(() => {
    if (enabled && !connected && token) void hello();
  }, HELLO_INTERVAL_MS);

  pollTimer = setInterval(() => {
    if (enabled && connected && token) void poll();
  }, POLL_INTERVAL_MS);
}

// ---- public bridge service API ----------------------------------------------

export const bridgeService = {
  getStatus(): BridgeStatePayload {
    let state: BridgeStatus = 'disconnected';
    if (!enabled) {
      state = 'disabled';
    } else if (connected) {
      state = 'connected';
    } else if (!token) {
      state = 'needs-token';
    } else {
      state = 'connecting';
    }
    return {
      state,
      detail: lastError,
      seq,
      enabled,
    };
  },

  async boot(): Promise<void> {
    try {
      if (typeof figma.clientStorage?.getAsync === 'function') {
        const storedToken = await figma.clientStorage.getAsync(TOKEN_KEY);
        if (typeof storedToken === 'string' && storedToken) {
          token = storedToken;
        }
        const storedEnabled = await figma.clientStorage.getAsync(ENABLED_KEY);
        if (typeof storedEnabled === 'boolean') {
          enabled = storedEnabled;
        } else {
          enabled = true;
        }
      }
    } catch {
      // storage unavailable
    }

    if (!enabled) {
      notifyUi('disabled');
    } else if (token) {
      notifyUi('connecting');
      void hello();
    } else {
      notifyUi('needs-token');
    }

    startLoops();
  },

  async setToken(newToken: string): Promise<void> {
    token = newToken.trim();
    enabled = true;
    try {
      if (typeof figma.clientStorage?.setAsync === 'function') {
        await figma.clientStorage.setAsync(TOKEN_KEY, token);
        await figma.clientStorage.setAsync(ENABLED_KEY, true);
      }
    } catch {
      // storage unavailable
    }
    notifyUi('connecting');
    const ok = await hello();
    if (ok && figma.currentPage?.selection?.length === 1) {
      try {
        const data = await extractNodeData(figma.currentPage.selection[0]);
        void this.pushSelection('single', 1, data);
      } catch {
        // ignore
      }
    }
  },

  async toggleEnabled(newEnabled: boolean): Promise<void> {
    enabled = newEnabled;
    try {
      if (typeof figma.clientStorage?.setAsync === 'function') {
        await figma.clientStorage.setAsync(ENABLED_KEY, enabled);
      }
    } catch {
      // storage unavailable
    }

    if (!enabled) {
      connected = false;
      notifyUi('disabled');
    } else {
      if (!token) {
        notifyUi('needs-token');
      } else {
        notifyUi('connecting');
        void hello();
      }
    }
  },

  async pushSelection(
    kind: 'single' | 'pair' | 'none',
    count: number,
    data?: NodeInspectionData
  ): Promise<void> {
    if (!enabled || !connected || !token) return;

    const push: SelectionPush = {
      seq: ++seq,
      kind,
      count,
      pushedAt: Date.now(),
    };

    if (kind === 'single') {
      if (data) {
        push.data = data;
      } else if (figma.currentPage?.selection?.length === 1) {
        try {
          push.data = await extractNodeData(figma.currentPage.selection[0]);
        } catch (err: unknown) {
          lastError = err instanceof Error ? err.message : 'extraction failed';
          notifyUi('connected', lastError);
          return;
        }
      }
    }

    try {
      await post('/push', push);
      notifyUi('connected');
    } catch {
      // dropped push is harmless
    }
  },
};
