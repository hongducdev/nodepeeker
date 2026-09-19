import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { startFakePlugin, FIXTURE } from '../bridge/fake-plugin.mjs';

/**
 * End-to-end proof that the broker, the plugin protocol and the MCP surface agree.
 *
 * The real plugin can only be exercised inside Figma, so this drives the broker with
 * `fake-plugin.mjs` — same protocol, same wire shapes, no Figma. Anything that passes here and
 * fails in Figma is therefore a CSP or manifest problem, not a protocol problem.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 39401; // not 3939: must not collide with a broker the developer left running
const TOKEN = 'integration-test-token';
const BASE = `http://127.0.0.1:${PORT}`;

let broker: ChildProcess;
let fake: Awaited<ReturnType<typeof startFakePlugin>>;

// ---- minimal MCP client over Streamable HTTP --------------------------------

interface JsonRpcResponse {
  jsonrpc: string;
  id: number | string | null;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

async function mcp(
  body: Record<string, unknown>,
  sessionId?: string,
): Promise<{ sessionId?: string; json: JsonRpcResponse | null; status: number }> {
  const res = await fetch(`${BASE}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // The transport requires the client to accept both.
      Accept: 'application/json, text/event-stream',
      'X-Bridge-Token': TOKEN,
      ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
    },
    body: JSON.stringify(body),
  });

  const returnedId = res.headers.get('mcp-session-id') ?? sessionId;
  const contentType = res.headers.get('content-type') ?? '';

  if (res.status === 202 || res.status === 204) return { sessionId: returnedId, json: null, status: res.status };

  if (contentType.includes('text/event-stream')) {
    const text = await res.text();
    const line = text.split('\n').find((l) => l.startsWith('data:'));
    return { sessionId: returnedId, json: line ? JSON.parse(line.slice(5).trim()) : null, status: res.status };
  }

  return { sessionId: returnedId, json: (await res.json()) as JsonRpcResponse, status: res.status };
}

/** Calls a tool and returns the parsed JSON payload the handler produced. */
async function callTool(sessionId: string, name: string, args: Record<string, unknown> = {}) {
  const { json } = await mcp(
    { jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name, arguments: args } },
    sessionId,
  );
  const content = (json?.result?.content ?? []) as Array<{ type: string; text: string }>;
  const text = content.find((c) => c.type === 'text')?.text ?? '';
  return { isError: Boolean(json?.result?.isError), payload: text ? JSON.parse(text) : null };
}

// ---- lifecycle --------------------------------------------------------------

async function waitForPing(timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/ping`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('broker did not start');
}

beforeAll(async () => {
  await build({
    entryPoints: [join(ROOT, 'bridge', 'broker.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'es2022',
    outfile: join(ROOT, 'bridge', 'dist', 'broker.mjs'),
    // Keep node_modules external: the MCP SDK does dynamic work esbuild should not inline.
    packages: 'external',
    logLevel: 'silent',
  });

  broker = spawn(process.execPath, [join(ROOT, 'bridge', 'dist', 'broker.mjs'), '--port', String(PORT), '--token', TOKEN], {
    stdio: 'ignore',
  });

  await waitForPing();
  fake = await startFakePlugin({ port: PORT, token: TOKEN });
}, 60_000);

afterAll(() => {
  fake?.stop();
  broker?.kill();
});

// ---- tests ------------------------------------------------------------------

describe('bridge integration', () => {
  let sessionId: string;

  it('completes the MCP handshake and advertises exactly three tools', async () => {
    const init = await mcp({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'vitest', version: '1' } },
    });

    expect(init.status).toBe(200);
    expect(init.sessionId).toBeTruthy();
    sessionId = init.sessionId!;

    await mcp({ jsonrpc: '2.0', method: 'notifications/initialized' }, sessionId);

    const { json } = await mcp({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, sessionId);
    const tools = (json?.result?.tools ?? []) as Array<{ name: string }>;
    expect(tools.map((t) => t.name).sort()).toEqual(['get_node', 'get_selection', 'status']);
  }, 20_000);

  it('reports the plugin as connected and names the open file', async () => {
    const { isError, payload } = await callTool(sessionId, 'status');
    expect(isError).toBe(false);
    expect(payload.connected).toBe(true);
    expect(payload.fileName).toBe('Fake Design System');
  }, 20_000);

  it('answers get_selection from the pushed snapshot with the compact summary by default', async () => {
    const { payload } = await callTool(sessionId, 'get_selection');

    expect(payload.kind).toBe('single');
    expect(payload.view).toBe('summary');
    expect(payload.node.name).toBe('Primary Button');
    // The summary must stay small — that is its entire reason to exist.
    expect(payload.node).not.toHaveProperty('css');
    expect(payload.node).not.toHaveProperty('colors');
    expect(payload.node.width).toBe(148);
    expect(payload.node.radius).toBe(8);
  }, 20_000);

  it('projects the same payload into tailwind and css views without a second extraction', async () => {
    const tailwind = await callTool(sessionId, 'get_selection', { view: 'tailwind' });
    expect(tailwind.payload.node.tailwind).toContain('flex');
    expect(tailwind.payload.node.tailwind).toContain('bg-[#1E66F5]');

    const css = await callTool(sessionId, 'get_selection', { view: 'css' });
    expect(css.payload.node.css['background-color']).toBe('#1E66F5');
  }, 20_000);

  it('round-trips get_node through the plugin command queue', async () => {
    const { payload } = await callTool(sessionId, 'get_node', { nodeId: FIXTURE.id, view: 'summary' });
    expect(payload.node.id).toBe(FIXTURE.id);
    expect(payload.node.name).toBe('Primary Button');
  }, 20_000);

  it('surfaces a plugin-side NODE_NOT_FOUND as an MCP error rather than a crash', async () => {
    const { isError, payload } = await callTool(sessionId, 'get_node', { nodeId: '999:999' });
    expect(isError).toBe(true);
    expect(payload.error.code).toBe('NODE_NOT_FOUND');
  }, 20_000);

  it('rejects a stale selection push so an old extraction cannot overwrite a newer one', async () => {
    const before = (await callTool(sessionId, 'get_selection')).payload.node.name;

    const res = await fetch(`${BASE}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Bridge-Token': TOKEN },
      body: JSON.stringify({
        seq: 0, // already superseded by the fake plugin's pushes
        kind: 'single',
        count: 1,
        pushedAt: Date.now(),
        data: { ...FIXTURE, name: 'STALE — must not win' },
      }),
    });

    expect(await res.json()).toMatchObject({ accepted: false });
    expect((await callTool(sessionId, 'get_selection')).payload.node.name).toBe(before);
  }, 20_000);

  it('refuses MCP calls without the bridge token', async () => {
    const res = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    expect(res.status).toBe(401);
  }, 20_000);
});
