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
  fileKey: 'aXrGAc4tTcMFWklkcboC1l' as string | undefined,
  root: { setRelaunchData: vi.fn(), name: 'Frameflow (Copy)' },
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

describe('sandbox video export', () => {
  const frame = () => {
    const f = {
      id: '9:9',
      name: 'Loading / Loop',
      type: 'FRAME',
      // A frame placed directly on a page: the only thing video export accepts.
      parent: { type: 'PAGE' },
      exportAsync,
      getTopLevelFrame: () => f,
    };
    return f;
  };

  it('encodes the resolved top-level frame as MP4 with the requested settings', async () => {
    selection.length = 0;
    selection.push(frame());

    await send({
      type: 'REQUEST_VIDEO_EXPORT',
      options: { format: 'MP4', fps: 24, quality: 'MEDIUM', loopCount: 0, scale: 2 },
    });

    expect(exportAsync).toHaveBeenCalledWith({
      format: 'MP4',
      fps: 24,
      quality: 'MEDIUM',
      constraint: { type: 'SCALE', value: 2 },
    });
    const result = posted.find((m) => m.type === 'VIDEO_EXPORT_RESULT');
    expect(result?.payload).toMatchObject({ format: 'MP4', name: 'Loading - Loop' });
    expect(exportAsync).toHaveBeenCalledTimes(1);
  });

  it('sends a loop count for GIF, which has no quality preset', async () => {
    selection.length = 0;
    selection.push(frame());

    await send({
      type: 'REQUEST_VIDEO_EXPORT',
      options: { format: 'GIF', fps: 15, quality: 'HIGH', loopCount: 3, scale: 1 },
    });

    expect(exportAsync).toHaveBeenCalledWith({
      format: 'GIF',
      fps: 15,
      loopCount: 3,
      constraint: { type: 'SCALE', value: 1 },
    });
    expect(posted[0].payload).toMatchObject({ format: 'GIF' });
  });

  it('clamps an fps the format does not accept instead of passing it to Figma', async () => {
    selection.length = 0;
    selection.push(frame());

    // 60 is an MP4 rate; GIF accepts it neither at the type nor at the API level.
    await send({
      type: 'REQUEST_VIDEO_EXPORT',
      options: { format: 'GIF', fps: 60, quality: 'HIGH', loopCount: 0, scale: 1 },
    });

    expect(exportAsync).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'GIF', fps: 30 })
    );
  });

  it('clamps and passes through MP4 rates too, since both formats are guarded', async () => {
    selection.length = 0;
    selection.push(frame());

    // 13 is not an MP4 rate -> snaps to 12; 60 is one -> reaches Figma untouched.
    await send({
      type: 'REQUEST_VIDEO_EXPORT',
      options: { format: 'MP4', fps: 13, quality: 'HIGH', loopCount: 0, scale: 1 },
    });
    expect(exportAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ format: 'MP4', fps: 12 })
    );

    await send({
      type: 'REQUEST_VIDEO_EXPORT',
      options: { format: 'MP4', fps: 60, quality: 'HIGH', loopCount: 0, scale: 1 },
    });
    expect(exportAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ format: 'MP4', fps: 60 })
    );
  });

  it('ships the encoded bytes as a Uint8Array, not a number array', async () => {
    // The regression this transport change exists to prevent: a multi-megabyte video
    // crossing as millions of JS numbers.
    selection.length = 0;
    selection.push(frame());

    await send({
      type: 'REQUEST_VIDEO_EXPORT',
      options: { format: 'GIF', fps: 15, quality: 'HIGH', loopCount: 0, scale: 1 },
    });

    const payload = posted[0].payload as { bytes: unknown; name: string };
    expect(payload.bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(payload.bytes as Uint8Array)).toEqual([1, 2, 3]);
    expect(payload.name).toBe('Loading - Loop');
  });

  it('refuses when the selection has no enclosing top-level frame', async () => {
    selection.length = 0;
    selection.push({ ...node(), getTopLevelFrame: () => undefined });

    await send({
      type: 'REQUEST_VIDEO_EXPORT',
      options: { format: 'MP4', fps: 30, quality: 'HIGH', loopCount: 0, scale: 1 },
    });

    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({
      type: 'EXPORT_ERROR',
      error: expect.stringContaining('frame placed directly on the page'),
    });
    expect(exportAsync).not.toHaveBeenCalled();
  });

  it('names the encoded frame, not the selected layer, when encoding fails', async () => {
    // The two differ whenever the selection is nested, which is the case the resolver
    // exists for; naming the selection would send the user to the wrong layer.
    const outer = frame();
    const nested = {
      ...node(),
      id: '9:1',
      name: 'Nested / Layer',
      getTopLevelFrame: () => outer,
    };
    selection.length = 0;
    selection.push(nested);
    exportShouldFail = true;

    await send({
      type: 'REQUEST_VIDEO_EXPORT',
      options: { format: 'MP4', fps: 30, quality: 'HIGH', loopCount: 0, scale: 1 },
    });

    expect(posted[0]).toMatchObject({
      type: 'EXPORT_ERROR',
      error: expect.stringContaining('Loading / Loop'),
    });
    expect(posted[0]).toMatchObject({
      error: expect.not.stringContaining('Nested / Layer'),
    });
    // The underlying reason must survive, or the user cannot act on the failure.
    expect(posted[0]).toMatchObject({
      error: expect.stringContaining('export unavailable'),
    });
  });
});

describe('sandbox file context', () => {
  it('posts the file key and name on init so the UI can build a deep link', async () => {
    figmaMock.fileKey = 'aXrGAc4tTcMFWklkcboC1l';
    await send({ type: 'INIT_REQUEST' });

    const context = posted.find((m) => m.type === 'FILE_CONTEXT');
    expect(context).toBeDefined();
    expect(context?.payload).toEqual({
      fileKey: 'aXrGAc4tTcMFWklkcboC1l',
      fileName: 'Frameflow (Copy)',
    });
  });

  it('omits the file key when the plugin has no private-plugin access', async () => {
    // Public plugins and unsaved files never receive a key; the field must be absent
    // rather than a placeholder, so the UI falls back instead of building a dead URL.
    figmaMock.fileKey = undefined;
    await send({ type: 'INIT_REQUEST' });

    const context = posted.find((m) => m.type === 'FILE_CONTEXT');
    expect(context?.payload).toEqual({ fileKey: undefined, fileName: 'Frameflow (Copy)' });
  });

  it('falls back to a name when the document has none', async () => {
    figmaMock.root.name = '';
    await send({ type: 'INIT_REQUEST' });

    const context = posted.find((m) => m.type === 'FILE_CONTEXT');
    expect(context?.payload).toMatchObject({ fileName: 'Untitled' });
    figmaMock.root.name = 'Frameflow (Copy)';
  });
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

  it('defaults PNG to a 2x scale and ships bytes as a Uint8Array', async () => {
    await send({ type: 'REQUEST_EXPORT', format: 'PNG', action: 'download' });

    expect(exportAsync).toHaveBeenCalledWith({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 2 },
    });
    const payload = posted[0].payload as { bytes: Uint8Array; action: string };
    // A typed array, not number[]: a multi-megabyte video would otherwise cross the
    // boundary as millions of individual JS numbers.
    expect(payload.bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(payload.bytes)).toEqual([1, 2, 3]);
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
