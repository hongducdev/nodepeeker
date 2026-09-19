/**
 * NodePeeker Bridge — plugin sandbox.
 *
 * The plugin is the *data source*, not a second inspector: it reuses `extractNodeData` from
 * the shipped plugin's sandbox so the agent and the panel can never disagree about a node.
 *
 * It speaks plain HTTP via Figma's Fetch API (available in the sandbox — `document` and
 * `window` are not, but `fetch` is). No UI iframe is needed for networking, which is why this
 * file has no realm bridge in it.
 *
 * Nothing here is allowed to throw into the broker's lap: a dead broker must leave Figma
 * working normally, just with the panel showing "disconnected".
 */

import { extractNodeData } from '../../src/code/extractors';
import type { NodeInspectionData } from '../../src/types/messages';
import type { CommandResult, PluginCommand, PluginHello, SelectionPush } from '../protocol';
import { POLL_INTERVAL_MS } from '../protocol';

const BROKER = 'http://localhost:3939';
const TOKEN_KEY = 'nodepeeker.bridge.token';
const HELLO_INTERVAL_MS = 2_000;

let token: string | null = null;
let seq = 0;
let connected = false;
let lastError: string | null = null;

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

// ---- UI ---------------------------------------------------------------------

type UiState = 'needs-token' | 'connecting' | 'connected' | 'disconnected';

function notifyUi(state: UiState, detail?: string): void {
  figma.ui.postMessage({
    type: 'STATUS',
    state,
    detail: detail ?? null,
    fileName: figma.root.name,
    seq,
  });
}

// ---- broker lifecycle -------------------------------------------------------

async function hello(): Promise<boolean> {
  if (!token) return false;
  const payload: PluginHello = {
    fileName: figma.root.name,
    // Readable only for private/local plugins; null is expected, not an error.
    fileKey: typeof figma.fileKey === 'string' ? figma.fileKey : null,
    capabilities: ['node', 'selection'],
  };

  try {
    await post('/hello', payload);
    if (!connected) {
      connected = true;
      lastError = null;
      notifyUi('connected');
      figma.notify('NodePeeker Bridge connected');
    }
    return true;
  } catch (err: unknown) {
    if (connected) figma.notify('NodePeeker Bridge disconnected');
    connected = false;
    lastError = err instanceof Error ? err.message : 'unknown error';
    notifyUi('disconnected', lastError);
    return false;
  }
}

/** Fire-and-forget, exactly like NodePeeker's own `selectionchange` handler. */
async function pushSelection(): Promise<void> {
  if (!connected) return;

  const selection = figma.currentPage.selection;
  const kind: SelectionPush['kind'] =
    selection.length === 1 ? 'single' : selection.length === 2 ? 'pair' : 'none';

  const push: SelectionPush = {
    seq: ++seq,
    kind,
    count: selection.length,
    pushedAt: Date.now(),
  };

  // Only a single layer is worth extracting; the broker projects views from this one payload.
  if (kind === 'single') {
    try {
      push.data = await extractNodeData(selection[0]);
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : 'extraction failed';
      notifyUi('connected', lastError);
      return;
    }
  }

  try {
    await post('/push', push);
    notifyUi('connected');
  } catch {
    // A dropped push is harmless: the next selection change re-sends, and the broker's TTL
    // will mark the plugin disconnected if this keeps failing.
  }
}

// ---- command loop -----------------------------------------------------------

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
        const data: NodeInspectionData = await extractNodeData(node as SceneNode);
        return { id: command.id, ok: true, data };
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
  if (!connected || !token) return;
  try {
    const commands = (await get('/commands')) as PluginCommand[];
    for (const command of commands) {
      const result = await execute(command);
      await post('/result', result);
    }
  } catch {
    connected = false;
    notifyUi('disconnected', 'poll failed');
  }
}

// ---- boot -------------------------------------------------------------------

function startLoops(): void {
  // The sandbox exposes `setInterval` as a bare global — there is no `window` here, and
  // referring to one would typecheck (DOM libs are on) and then fail at runtime.
  setInterval(() => {
    if (!connected) void hello();
  }, HELLO_INTERVAL_MS);

  setInterval(() => {
    void poll();
  }, POLL_INTERVAL_MS);
}

async function boot(): Promise<void> {
  const stored = await figma.clientStorage.getAsync(TOKEN_KEY);
  if (typeof stored === 'string' && stored) {
    token = stored;
    notifyUi('connecting');
    await hello();
  } else {
    notifyUi('needs-token');
  }
  startLoops();
}

figma.showUI(__html__, { width: 340, height: 220, themeColors: true });

figma.ui.onmessage = (msg: { type?: string; token?: string }) => {
  if (msg?.type === 'SET_TOKEN' && msg.token) {
    token = msg.token.trim();
    void figma.clientStorage.setAsync(TOKEN_KEY, token).then(() => {
      notifyUi('connecting');
      return hello().then(() => pushSelection());
    });
  }
};

figma.on('selectionchange', () => {
  void pushSelection();
});

void boot().then(() => pushSelection());
