import { describe, it, expect, afterEach, vi } from 'vitest';
import { BridgeState } from '../bridge/state';
import { PLUGIN_TTL_MS } from '../bridge/protocol';

const hello = () => ({ fileName: 'Test File', fileKey: null, capabilities: ['node'] });
const push = (seq: number) => ({ seq, kind: 'single' as const, count: 1, pushedAt: Date.now(), data: { id: '1:2' } });

afterEach(() => {
  vi.useRealTimers();
});

describe('BridgeState — selection staleness', () => {
  it('accepts the first push and reports its snapshot', () => {
    const state = new BridgeState();
    state.registerPlugin(hello());

    expect(state.pushSelection(push(0))).toBe(true);
    expect(state.getSnapshot()?.seq).toBe(0);
  });

  it('drops a push that is not newer than the last accepted one', () => {
    const state = new BridgeState();
    state.registerPlugin(hello());

    expect(state.pushSelection(push(5))).toBe(true);
    // The whole point: a slow extraction from an earlier selection must not overwrite a newer one.
    expect(state.pushSelection(push(5))).toBe(false);
    expect(state.pushSelection(push(4))).toBe(false);
    expect(state.getSnapshot()?.seq).toBe(5);
  });

  it('accepts a newer push after a drop', () => {
    const state = new BridgeState();
    state.registerPlugin(hello());
    state.pushSelection(push(5));
    state.pushSelection(push(4));

    expect(state.pushSelection(push(6))).toBe(true);
    expect(state.getSnapshot()?.seq).toBe(6);
  });
});

describe('BridgeState — liveness', () => {
  it('reports disconnected before the plugin ever speaks', () => {
    expect(new BridgeState().status().connected).toBe(false);
  });

  it('stays connected while the plugin keeps talking and drops after the TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    const state = new BridgeState();
    state.registerPlugin(hello());
    expect(state.status().connected).toBe(true);

    // A poll within the TTL keeps it alive even with no selection change.
    vi.setSystemTime(1_000_000 + PLUGIN_TTL_MS - 1);
    state.touch();
    expect(state.status().connected).toBe(true);

    vi.setSystemTime(1_000_000 + PLUGIN_TTL_MS * 3);
    expect(state.status().connected).toBe(false);
  });

  it('reports the snapshot age so a stuck plugin is visible rather than implied', () => {
    vi.useFakeTimers();
    vi.setSystemTime(500_000);

    const state = new BridgeState();
    state.registerPlugin(hello());
    state.pushSelection(push(0));
    expect(state.status().snapshotAgeMs).toBe(0);

    vi.setSystemTime(500_250);
    expect(state.status().snapshotAgeMs).toBe(250);
  });
});

describe('BridgeState — commands', () => {
  it('fails a command immediately when the plugin is absent instead of waiting out the timeout', async () => {
    const state = new BridgeState();
    const result = await state.requestCommand('GET_NODE', { nodeId: '1:2' }, 60_000);

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('PLUGIN_DISCONNECTED');
  });

  it('delivers a queued command exactly once', () => {
    const state = new BridgeState();
    state.registerPlugin(hello());

    void state.requestCommand('GET_NODE', { nodeId: '1:2' });

    expect(state.takeCommands()).toHaveLength(1);
    expect(state.takeCommands()).toHaveLength(0);
  });

  it('resolves a command with the plugin result', async () => {
    const state = new BridgeState();
    state.registerPlugin(hello());

    const pending = state.requestCommand('GET_NODE', { nodeId: '1:2' });
    const [command] = state.takeCommands();

    expect(state.settle({ id: command.id, ok: true, data: { id: '1:2' } })).toBe(true);
    await expect(pending).resolves.toMatchObject({ ok: true, data: { id: '1:2' } });
  });

  it('times out a command the plugin never answers', async () => {
    const state = new BridgeState();
    state.registerPlugin(hello());

    const pending = state.requestCommand('GET_NODE', { nodeId: '1:2' }, 20);
    state.takeCommands();

    await expect(pending).resolves.toMatchObject({ ok: false, error: { code: 'TIMEOUT' } });
  });

  it('ignores a result whose command id is unknown', () => {
    const state = new BridgeState();
    expect(state.settle({ id: 'cmd_999', ok: true })).toBe(false);
  });

  it('drops queued and in-flight commands on dispose', async () => {
    const state = new BridgeState();
    state.registerPlugin(hello());
    void state.requestCommand('GET_NODE', { nodeId: '1:2' }, 60_000);

    state.dispose();
    expect(state.takeCommands()).toHaveLength(0);
  });
});
