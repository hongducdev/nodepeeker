/**
 * Fake bridge plugin — speaks the exact protocol the real Figma plugin speaks, in plain Node.
 *
 * This is what makes the broker verifiable. The whole design hinges on a plugin that is only
 * testable inside Figma; this stands in for it so the protocol, the cache, the staleness guard
 * and the MCP surface can all be proven before anyone opens Figma.
 *
 * Usable two ways:
 *   node bridge/fake-plugin.mjs        # manual: drives a running broker
 *   import { startFakePlugin }         # from tests/bridge-integration.test.ts
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

export const DEFAULT_PORT = 3939;

export function readToken(tokenPath = join(HERE, '.token')) {
  if (process.env.NODEPEEKER_BRIDGE_TOKEN) return process.env.NODEPEEKER_BRIDGE_TOKEN;
  if (!existsSync(tokenPath)) {
    throw new Error(`No token at ${tokenPath}. Start the broker once so it can generate one.`);
  }
  return readFileSync(tokenPath, 'utf8').trim();
}

/** Shaped like a real `extractNodeData` result — a button frame. */
export const FIXTURE = {
  id: '1:2',
  name: 'Primary Button',
  type: 'FRAME',
  css: {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'background-color': '#1E66F5',
    'border-radius': '8px',
  },
  colors: [
    {
      hex: '#1E66F5',
      rgba: 'rgb(30, 102, 245)',
      hsl: 'hsl(220, 91%, 54%)',
      opacity: 1,
      source: 'fill',
    },
  ],
  boxModel: {
    width: 148,
    height: 40,
    x: 0,
    y: 0,
    paddingTop: 8,
    paddingRight: 16,
    paddingBottom: 8,
    paddingLeft: 16,
    gap: 8,
    cornerRadius: 8,
  },
  layoutMode: 'HORIZONTAL',
  primaryAxisAlign: 'CENTER',
  counterAxisAlign: 'CENTER',
};

/**
 * Starts a fake plugin against a running broker. Returns a handle with `stop()` and the
 * sequence numbers it pushed, so a test can assert the broker accepted or dropped them.
 */
export async function startFakePlugin({ port = DEFAULT_PORT, token, host = '127.0.0.1', log = () => {} } = {}) {
  const base = `http://${host}:${port}`;
  const auth = token ?? readToken();
  const headers = { 'Content-Type': 'application/json', 'X-Bridge-Token': auth };

  let seq = 0;
  let stopped = false;
  const accepted = [];
  const dropped = [];

  const post = async (path, body) => {
    const res = await fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
    return res.json();
  };

  await post('/hello', { fileName: 'Fake Design System', fileKey: null, capabilities: ['node', 'selection'] });
  log('fake plugin registered');

  const push = async ({ kind = 'single', count = 1, data = FIXTURE } = {}) => {
    const payload = { seq: ++seq, kind, count, pushedAt: Date.now(), data };
    const result = await post('/push', payload);
    (result.accepted ? accepted : dropped).push(payload.seq);
    return result.accepted;
  };

  await push();
  log(`pushed selection seq=${seq}`);

  const timer = setInterval(async () => {
    if (stopped) return;
    try {
      const res = await fetch(`${base}/commands`, { headers });
      if (!res.ok) return;
      const commands = await res.json();

      for (const command of commands) {
        log(`received ${command.type}`);
        let result;
        if (command.type === 'GET_SELECTION') {
          result = { id: command.id, ok: true, data: FIXTURE };
        } else if (command.type === 'GET_NODE') {
          const nodeId = command.params?.nodeId;
          result =
            nodeId === FIXTURE.id
              ? { id: command.id, ok: true, data: FIXTURE }
              : { id: command.id, ok: false, error: { code: 'NODE_NOT_FOUND', message: `${nodeId} is not in this file` } };
        } else {
          result = { id: command.id, ok: false, error: { code: 'BAD_REQUEST', message: `unsupported ${command.type}` } };
        }
        await post('/result', result);
      }
    } catch (err) {
      log(`poll failed: ${err.message}`);
    }
  }, 100);

  return {
    push,
    accepted,
    dropped,
    stop() {
      stopped = true;
      clearInterval(timer);
    },
  };
}

// Run directly: `node bridge/fake-plugin.mjs`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const handle = await startFakePlugin({ log: (m) => console.log(`[fake-plugin] ${m}`) });
  console.log('[fake-plugin] running — the broker should report it as connected. Ctrl+C to stop.');
  process.on('SIGINT', () => {
    handle.stop();
    process.exit(0);
  });
}
