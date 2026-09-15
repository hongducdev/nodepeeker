import { describe, it, expect } from 'vitest';
import { extractNodeData } from '../src/code/extractors';
import { transpileToTailwind } from '../src/utils/tailwind-transpiler';
import { NodeInspectionData } from '../src/types/messages';

const geometry = {
  width: 100,
  height: 50,
  x: 0,
  y: 0,
  fills: [],
  strokes: [],
};

const asNode = (over: Record<string, unknown>) =>
  ({ ...geometry, ...over }) as unknown as SceneNode;

const asData = (over: Partial<NodeInspectionData> = {}): NodeInspectionData => ({
  id: '1:2',
  name: 'Node',
  type: 'FRAME',
  css: {},
  colors: [],
  boxModel: { ...geometry, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, gap: 0, cornerRadius: 0 },
  ...over,
});

describe('extraction: architectural debt', () => {
  it('does not perform a vector export while extracting', async () => {
    // Vector export is now on demand; doing it per selection change was the point of the fix.
    let exports = 0;
    const node = asNode({
      exportAsync: async () => {
        exports += 1;
        return new Uint8Array();
      },
    });

    await extractNodeData(node);

    expect(exports).toBe(0);
  });

  it('reports opacity even when the node has no shadow', async () => {
    // Regression: opacity used to be captured inside the drop-shadow branch, so a
    // translucent shadowless node silently reported nothing.
    const node = asNode({ opacity: 0.4, effects: [] });
    const data = await extractNodeData(node);

    expect(data.opacity).toBe(0.4);
    expect(data.shadows).toBeUndefined();
  });

  it('omits opacity when the node is fully opaque', async () => {
    const data = await extractNodeData(asNode({ opacity: 1 }));
    expect(data.opacity).toBeUndefined();
  });
});

describe('extraction: shadows', () => {
  it('captures the real geometry and colour of a drop shadow', async () => {
    const data = await extractNodeData(
      asNode({
        effects: [
          {
            type: 'DROP_SHADOW',
            visible: true,
            offset: { x: 0, y: 4 },
            radius: 8,
            spread: 2,
            color: { r: 0, g: 0, b: 0, a: 0.25 },
          },
        ],
      })
    );

    expect(data.shadows).toHaveLength(1);
    expect(data.shadows?.[0]).toEqual({
      inner: false,
      offsetX: 0,
      offsetY: 4,
      blur: 8,
      spread: 2,
      color: '#000000',
      opacity: 0.25,
    });
  });

  it('marks inner shadows and skips hidden or non-shadow effects', async () => {
    const data = await extractNodeData(
      asNode({
        effects: [
          { type: 'INNER_SHADOW', visible: true, offset: { x: 0, y: 2 }, radius: 4, spread: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
          { type: 'DROP_SHADOW', visible: false, offset: { x: 1, y: 1 }, radius: 1, spread: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
          { type: 'LAYER_BLUR', visible: true, radius: 5 },
        ],
      })
    );

    expect(data.shadows).toHaveLength(1);
    expect(data.shadows?.[0].inner).toBe(true);
  });
});

describe('extraction: sizing and position', () => {
  it('maps auto-layout Hug onto the physical axis', async () => {
    const horizontal = await extractNodeData(
      asNode({
        layoutMode: 'HORIZONTAL',
        primaryAxisSizingMode: 'AUTO',
        counterAxisSizingMode: 'FIXED',
      })
    );
    expect(horizontal.sizing).toEqual({ hugHorizontal: true, hugVertical: false });

    // The primary axis is vertical here, so hugging it means hugging height.
    const vertical = await extractNodeData(
      asNode({
        layoutMode: 'VERTICAL',
        primaryAxisSizingMode: 'AUTO',
        counterAxisSizingMode: 'FIXED',
      })
    );
    expect(vertical.sizing).toEqual({ hugHorizontal: false, hugVertical: true });
  });

  it('flags absolutely positioned children', async () => {
    expect((await extractNodeData(asNode({ layoutPositioning: 'ABSOLUTE' }))).position).toEqual({
      absolute: true,
    });
    expect((await extractNodeData(asNode({ layoutPositioning: 'AUTO' }))).position).toBeUndefined();
  });
});

describe('extraction: video target', () => {
  const animatedFrame = (over: Record<string, unknown> = {}) => {
    const page = { type: 'PAGE' };
    const outer = {
      id: '9:9',
      name: 'Loading / Loop',
      type: 'FRAME',
      parent: page,
      timelines: [{ id: 't1', duration: 0.6 }],
      animationStyles: [],
      animations: {},
      ...over,
    } as unknown as FrameNode;
    return outer;
  };

  it('reports the frame and its motion duration when the frame is animated', async () => {
    const outer = animatedFrame();
    const data = await extractNodeData(
      asNode({ type: 'VECTOR', parent: outer, getTopLevelFrame: () => outer })
    );

    expect(data.video).toEqual({
      frameId: '9:9',
      frameName: 'Loading / Loop',
      durationSeconds: 0.6,
    });
  });

  it('reports nothing for a static frame, so the UI offers no dead action', async () => {
    // A frame with no Motion timeline is exactly what exportAsync rejects; gating here is
    // the point of the detection.
    const outer = animatedFrame({ timelines: [] });
    const data = await extractNodeData(
      asNode({ type: 'VECTOR', parent: outer, getTopLevelFrame: () => outer })
    );

    expect(data.video).toBeUndefined();
  });

  it('treats applied animation styles or keyframes as motion even without a timeline', async () => {
    const withStyles = await extractNodeData(
      asNode({
        parent: { type: 'PAGE' },
        getTopLevelFrame: () => animatedFrame({ timelines: [], animationStyles: [{ id: 'a1' }] }),
      })
    );
    expect(withStyles.video).toBeDefined();

    const withKeyframes = await extractNodeData(
      asNode({
        parent: { type: 'PAGE' },
        getTopLevelFrame: () =>
          animatedFrame({ timelines: [], animations: { TRANSLATION_X: { tracks: [] } } }),
      })
    );
    expect(withKeyframes.video).toBeDefined();
  });

  it('reports the longest timeline when a frame has several', async () => {
    // Descending, so a last-wins implementation cannot pass by accident.
    const outer = animatedFrame({
      timelines: [
        { id: 't1', duration: 1.25 },
        { id: 't2', duration: 0.4 },
      ],
    });
    const data = await extractNodeData(
      asNode({ parent: { type: 'PAGE' }, getTopLevelFrame: () => outer })
    );

    expect(data.video?.durationSeconds).toBe(1.25);
  });

  it('reports nothing when the selection has no enclosing page-level frame', async () => {
    const data = await extractNodeData(
      asNode({ parent: { type: 'PAGE' }, getTopLevelFrame: () => undefined })
    );
    expect(data.video).toBeUndefined();
  });
});

describe('transpiler: output fidelity', () => {
  it('emits leading and tracking for text', () => {
    const out = transpileToTailwind(
      asData({
        type: 'TEXT',
        typography: {
          fontFamily: 'Inter',
          fontWeight: 'Regular',
          fontSize: 16,
          lineHeight: '150%',
          letterSpacing: '5%',
          textAlign: 'LEFT',
        },
      })
    );
    expect(out).toContain('leading-[1.5]');
    expect(out).toContain('tracking-[0.05em]');
  });

  it('emits fit sizing for hugging frames and self-stretch for stretched children', () => {
    const hugging = transpileToTailwind(
      asData({ layoutMode: 'HORIZONTAL', sizing: { hugHorizontal: true, hugVertical: true } })
    );
    expect(hugging).toContain('w-fit');
    expect(hugging).toContain('h-fit');

    const stretched = transpileToTailwind(asData({ layoutAlign: 'STRETCH' }));
    expect(stretched).toContain('self-stretch');
  });

  it('emits absolute positioning with offsets', () => {
    const out = transpileToTailwind(
      asData({
        position: { absolute: true },
        boxModel: { ...asData().boxModel, x: 24, y: 16 },
      })
    );
    expect(out).toContain('absolute');
    expect(out).toContain('left-[24px]');
    expect(out).toContain('top-[16px]');
  });

  it('emits no shadow utility for a node without shadows', () => {
    // Closes the gap where a hardcoded preset could reappear on shadowless nodes.
    const out = transpileToTailwind(asData());
    expect(out).not.toContain('shadow');
  });

  it('emits real shadows and node opacity', () => {
    const out = transpileToTailwind(
      asData({
        opacity: 0.4,
        shadows: [
          {
            inner: false,
            offsetX: 0,
            offsetY: 2,
            blur: 4,
            spread: 0,
            color: '#000000',
            opacity: 0.3,
          },
        ],
      })
    );
    expect(out).toContain('shadow-[0px_2px_4px_0px_rgba(0,0,0,0.3)]');
    expect(out).toContain('opacity-40');
    // The old fabricated class must be gone for good.
    expect(out).not.toContain('shadow-md');
  });
});
