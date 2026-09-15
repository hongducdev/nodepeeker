import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import type { UIToPluginMessage } from '../src/types/messages';

/**
 * The sandbox entry (`src/code/code.ts`) runs against the injected `figma` global and
 * posts results back through `figma.ui.postMessage`. This exercises the export protocol
 * that the on-demand SVG tab depends on -- previously untested.
 */
const posted: Array<Record<string, unknown>> = [];
let exportShouldFail = false;

const exportAsync = vi.fn(async ({ format }: { format: string }) => {
  if (exportShouldFail) throw new Error('export unavailable');
  return format === 'SVG' ? new Uint8Array([60, 115, 118, 103, 47, 62]) : new Uint8Array([1, 2, 3]);
});

const selection: unknown[] = [];

const figmaMock = {
  showUI: vi.fn(),
  root: { setRelaunchData: vi.fn() },
  on: vi.fn(),
  currentPage: {
    get selection() {
      return selection;
    },
  },
  ui: {
    postMessage: (msg: Record<string, unknown>) => posted.push(msg),
    onmessage: undefined as unknown as (msg: UIToPluginMessage) => Promise<void>,
  },
};

const node = () => ({
  id: '1:7',
  name: 'Card / Hero',
  type: 'FRAME',
  width: 320,
  height: 240,
  x: 0,
  y: 0,
  css: {},
  fills: [],
  strokes: [],
  effects: [],
  exportAsync,
});

const send = (msg: UIToPluginMessage) => figmaMock.ui.onmessage(msg);

beforeAll(async () => {
  vi.stubGlobal('figma', figmaMock);
  vi.stubGlobal('__html__', '<html></html>');
  // Dynamic import, not static: `code.ts` reads the `figma` and `__html__` globals while
  // the module body evaluates, so the stubs above must exist first. A static import would
  // be hoisted ahead of them and the module would throw on load.
  await import('../src/code/code');
});

beforeEach(() => {
  posted.length = 0;
  exportShouldFail = false;
  exportAsync.mockClear();
  selection.length = 0;
  selection.push(node());
});

describe('sandbox export protocol', () => {
  it('answers a view request with the markup and echoes the node id', async () => {
    await send({ type: 'REQUEST_EXPORT', format: 'SVG', action: 'view' });

    const result = posted.find((m) => m.type === 'EXPORT_RESULT');
    expect(result).toBeDefined();
    expect(result?.payload).toMatchObject({
      format: 'SVG',
      content: '<svg/>',
      action: 'view',
      nodeId: '1:7',
    });
  });

  it('passes the copy and download actions through unchanged', async () => {
    for (const action of ['copy', 'download'] as const) {
      posted.length = 0;
      await send({ type: 'REQUEST_EXPORT', format: 'SVG', action });
      expect(posted[0].payload).toMatchObject({ action });
    }
  });

  it('defaults PNG to a 2x scale and ships bytes as a plain array', async () => {
    await send({ type: 'REQUEST_EXPORT', format: 'PNG', action: 'download' });

    expect(exportAsync).toHaveBeenCalledWith({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 2 },
    });
    const payload = posted[0].payload as { bytes: number[]; action: string };
    expect(Array.isArray(payload.bytes)).toBe(true);
    expect(payload.bytes).toEqual([1, 2, 3]);
    expect(payload.action).toBe('download');
  });

  it('honours an explicit PNG scale', async () => {
    await send({ type: 'REQUEST_EXPORT', format: 'PNG', scale: 4, action: 'download' });
    expect(exportAsync).toHaveBeenCalledWith({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 4 },
    });
  });

  it('sanitises the exported file name', async () => {
    selection.length = 0;
    selection.push({ ...node(), name: 'Card/Hero: v2*' });
    await send({ type: 'REQUEST_EXPORT', format: 'SVG', action: 'download' });

    expect(posted[0].payload).toMatchObject({ name: 'Card-Hero- v2-' });
  });

  it('reports EXPORT_ERROR instead of exporting when nothing is selected', async () => {
    selection.length = 0;
    await send({ type: 'REQUEST_EXPORT', format: 'SVG', action: 'view' });

    expect(posted[0]).toMatchObject({ type: 'EXPORT_ERROR' });
    expect(exportAsync).not.toHaveBeenCalled();
  });

  it('surfaces a failed export as EXPORT_ERROR rather than throwing', async () => {
    exportShouldFail = true;
    await send({ type: 'REQUEST_EXPORT', format: 'SVG', action: 'view' });

    expect(posted[0]).toMatchObject({ type: 'EXPORT_ERROR', error: 'export unavailable' });
  });
});
