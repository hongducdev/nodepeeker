/**
 * NodePeeker Bridge broker.
 *
 * Two servers in one process, on one port:
 *   • the plugin side  — plain HTTP the Figma sandbox reaches with `fetch` (CORS, token)
 *   • the client side  — MCP over Streamable HTTP, consumed by Cursor and pi.dev
 *
 * They share one `BridgeState`, which is why a `get_selection` call usually answers from
 * memory instead of round-tripping to Figma.
 *
 * Run:  node bridge/dist/broker.mjs [--port 3939] [--token <secret>]
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

import { BridgeState } from './state.js';
import { projectView } from './project.js';
import type { NodeInspectionData } from '../src/types/messages.js';
import type { CommandResult, SelectionPush, ViewName } from './protocol.js';

// ---- config -----------------------------------------------------------------

const args = process.argv.slice(2);
const argOf = (name: string, fallback?: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const PORT = Number(argOf('port', process.env.NODEPEEKER_BRIDGE_PORT ?? '3939'));
const HOST = '127.0.0.1'; // never 0.0.0.0 — this is a local developer tool

const HERE = dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = join(HERE, '..', '.token');

/**
 * A shared secret is not optional: the broker answers with `Access-Control-Allow-Origin: *`
 * because the plugin's origin is `null`, which means any website the user has open could
 * otherwise read their design data. A stable generated token keeps that closed without
 * forcing a new value into the client config on every restart.
 */
function resolveToken(): string {
  const fromFlag = argOf('token', process.env.NODEPEEKER_BRIDGE_TOKEN);
  if (fromFlag) return fromFlag;
  if (existsSync(TOKEN_FILE)) {
    const existing = readFileSync(TOKEN_FILE, 'utf8').trim();
    if (existing) return existing;
  }
  const generated = randomBytes(24).toString('base64url');
  writeFileSync(TOKEN_FILE, `${generated}\n`, { mode: 0o600 });
  return generated;
}

const TOKEN = resolveToken();
const state = new BridgeState();

// ---- http helpers -----------------------------------------------------------

/**
 * Only the plugin routes need CORS, and only they get it — the MCP transport manages its own
 * headers, and pre-setting them here would fight it.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Bridge-Token',
  'Access-Control-Max-Age': '600',
};

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });

const sendJson = (res: ServerResponse, status: number, payload: unknown): void => {
  const body = JSON.stringify(payload);
  res.writeHead(status, { ...CORS, 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
};

const authorized = (req: IncomingMessage, url: URL): boolean => {
  const header = req.headers['x-bridge-token'];
  if (typeof header === 'string' && header === TOKEN) return true;
  return url.searchParams.get('token') === TOKEN;
};

// ---- MCP --------------------------------------------------------------------

const VIEW_ENUM = z.enum(['summary', 'tailwind', 'css', 'full']);

function buildMcpServer(): McpServer {
  const server = new McpServer({ name: 'nodepeeker', version: '0.1.0' });

  const text = (payload: unknown) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  });

  const failure = (result: CommandResult) => ({
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ error: result.error ?? { code: 'INTERNAL', message: 'unknown failure' } }),
      },
    ],
  });

  server.registerTool(
    'status',
    {
      title: 'Bridge status',
      description:
        'Check whether the NodePeeker Bridge plugin is connected and which Figma file is open. ' +
        'Call this first: every other tool fails with PLUGIN_DISCONNECTED if the plugin is not running.',
    },
    async () => {
      const s = state.status();
      return text({
        ...s,
        // Say this out loud so an agent does not expect code generation from the bridge.
        hint:
          'This bridge returns raw Figma facts without spending Figma MCP quota. ' +
          'For generated code with Code Connect, use the official Figma MCP server instead.',
      });
    },
  );

  server.registerTool(
    'get_selection',
    {
      title: 'Get current Figma selection',
      description:
        'What the user currently has selected in Figma. Served from the plugin\'s pushed snapshot, ' +
        'so it is instant and costs no Figma quota. Defaults to the compact `summary` view — ' +
        'escalate to `tailwind` or `css` only when you actually need the styles.',
      inputSchema: { view: VIEW_ENUM.optional() },
    },
    async ({ view }) => {
      const selectedView: ViewName = (view as ViewName | undefined) ?? 'summary';
      const snapshot = state.getSnapshot();
      const s = state.status();

      if (!snapshot || snapshot.kind !== 'single' || !snapshot.data) {
        return text({
          kind: snapshot?.kind ?? 'none',
          count: snapshot?.count ?? 0,
          connected: s.connected,
          note: snapshot
            ? 'No single layer is selected, so there is nothing to inspect.'
            : 'The plugin has not pushed a selection yet.',
        });
      }

      return text({
        kind: snapshot.kind,
        count: snapshot.count,
        connected: s.connected,
        stale: !s.connected,
        snapshotAgeMs: s.snapshotAgeMs,
        view: selectedView,
        node: projectView(snapshot.data as NodeInspectionData, selectedView),
      });
    },
  );

  server.registerTool(
    'get_node',
    {
      title: 'Inspect a specific Figma node',
      description:
        'Inspect one node by id, regardless of what is selected. Use the compact `summary` view by ' +
        'default; `tailwind` and `css` cost more tokens, and `full` costs a lot more. ' +
        'Node ids look like "1:2" or "1-2".',
      inputSchema: { nodeId: z.string().min(1), view: VIEW_ENUM.optional() },
    },
    async ({ nodeId, view }) => {
      const selectedView: ViewName = (view as ViewName | undefined) ?? 'summary';
      const result = await state.requestCommand('GET_NODE', { nodeId });
      if (!result.ok) return failure(result);

      const data = result.data as NodeInspectionData | undefined;
      if (!data) {
        return failure({ id: result.id, ok: false, error: { code: 'NODE_NOT_FOUND', message: `No data for ${nodeId}` } });
      }
      return text({ view: selectedView, node: projectView(data, selectedView) });
    },
  );

  return server;
}

interface Session {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
}

/** Keyed by `mcp-session-id`. One entry per connected client (Cursor, pi.dev). */
const sessions = new Map<string, Session>();

async function handleMcp(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  if (!authorized(req, url)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'missing or bad X-Bridge-Token' }));
    return;
  }

  const rawSessionId = req.headers['mcp-session-id'];
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  const body = req.method === 'POST' ? JSON.parse((await readBody(req)) || '{}') : undefined;

  // An established session routes to the transport that owns it. Sessions are stateful on
  // purpose: a fresh server per request cannot remember the `initialize` handshake, so
  // `tools/call` would be rejected as un-initialized.
  if (sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'unknown session' } }));
      return;
    }
    await session.transport.handleRequest(req, res, body);
    return;
  }

  const server = buildMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id) => {
      sessions.set(id, { server, transport });
      log(`mcp session ${id.slice(0, 8)} opened`);
    },
  });

  transport.onclose = () => {
    const id = transport.sessionId;
    if (id) {
      sessions.delete(id);
      log(`mcp session ${id.slice(0, 8)} closed`);
    }
    void server.close();
  };

  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}

// ---- plugin routes ----------------------------------------------------------

async function handlePlugin(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  if (!authorized(req, url)) {
    sendJson(res, 401, { ok: false, error: 'missing or bad X-Bridge-Token' });
    return;
  }

  switch (`${req.method} ${url.pathname}`) {
    case 'POST /hello': {
      const body = JSON.parse((await readBody(req)) || '{}');
      state.registerPlugin({
        fileName: body.fileName ?? null,
        fileKey: body.fileKey ?? null,
        capabilities: body.capabilities ?? [],
      });
      log(`plugin registered · file="${body.fileName ?? 'unknown'}"`);
      sendJson(res, 200, { ok: true, pollIntervalMs: 300 });
      return;
    }

    case 'POST /push': {
      const push = JSON.parse((await readBody(req)) || '{}') as SelectionPush;
      const accepted = state.pushSelection(push);
      if (!accepted) log(`dropped stale push seq=${push.seq}`);
      sendJson(res, 200, { ok: true, accepted });
      return;
    }

    case 'GET /commands': {
      state.touch();
      const commands = state.takeCommands();
      if (commands.length) log(`dispatching ${commands.map((c) => c.type).join(', ')}`);
      sendJson(res, 200, commands);
      return;
    }

    case 'POST /result': {
      const result = JSON.parse((await readBody(req)) || '{}') as CommandResult;
      const matched = state.settle(result);
      if (!matched) log(`late/unknown result ${result.id}`);
      sendJson(res, 200, { ok: true, matched });
      return;
    }

    default:
      sendJson(res, 404, { ok: false, error: `no route for ${req.method} ${url.pathname}` });
  }
}

// ---- server -----------------------------------------------------------------

const log = (...parts: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 23)}]`, ...parts);

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  if (url.pathname === '/ping') {
    sendJson(res, 200, { ok: true, service: 'nodepeeker-bridge', ts: Date.now() });
    return;
  }

  const route = url.pathname === '/mcp' ? handleMcp : handlePlugin;
  route(req, res, url).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : 'unknown error';
    log('ERROR', message);
    if (!res.headersSent) sendJson(res, 500, { ok: false, error: message });
  });
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  NodePeeker Bridge broker');
  console.log(`  MCP   http://${HOST}:${PORT}/mcp`);
  console.log(`  token ${TOKEN}`);
  console.log('');
  console.log('  Cursor / pi.dev config:');
  console.log(`    { "url": "http://${HOST}:${PORT}/mcp",`);
  console.log(`      "headers": { "X-Bridge-Token": "${TOKEN}" } }`);
  console.log('');
});

const shutdown = () => {
  state.dispose();
  for (const [, session] of sessions) void session.transport.close();
  sessions.clear();
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
