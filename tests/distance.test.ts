import { describe, it, expect } from 'vitest';
import { measureDistance, unionBounds, type DistanceNode } from '../src/utils/distance';

const node = (name: string, x: number, y: number, width: number, height: number): DistanceNode => ({
  name,
  bounds: { x, y, width, height },
});

// A fixed reference box for every case: 100x50 at the origin.
const A = node('a', 0, 0, 100, 50);

describe('measureDistance: separated on one axis', () => {
  it('reports a horizontal gap with no vertical gap when B is to the right', () => {
    const m = measureDistance(A, node('b', 120, 0, 50, 50));

    expect(m.gapX).toBe(20);
    expect(m.gapY).toBe(0);
    expect(m.direction).toBe('right');
    expect(m.overlap).toBeNull();
  });

  it('reports a vertical gap when B is below', () => {
    const m = measureDistance(A, node('b', 0, 60, 100, 40));

    expect(m.gapX).toBe(0);
    expect(m.gapY).toBe(10);
    expect(m.direction).toBe('below');
  });

  it('reports the direction as left/above when B precedes A', () => {
    expect(measureDistance(A, node('b', -70, 0, 50, 50))).toMatchObject({
      direction: 'left',
      gapX: 20,
      gapY: 0,
    });
    expect(measureDistance(A, node('b', 0, -80, 50, 50))).toMatchObject({
      direction: 'above',
      gapX: 0,
      gapY: 30,
    });
  });

  it('reports both gaps and a diagonal distance when separated on both axes', () => {
    const m = measureDistance(A, node('b', 130, 70, 40, 40));

    expect(m.gapX).toBe(30);
    expect(m.gapY).toBe(20);
    expect(m.distance).toBe(36.06); // hypot(30, 20), rounded to 2dp
    // A diagonal is still described by its dominant axis.
    expect(m.direction).toBe('right');
  });
});

describe('measureDistance: touching versus overlapping', () => {
  it('treats contact on the near side as a zero gap without calling it an overlap', () => {
    // The ambiguous case: gap 0 on one axis. It is touching, not intersecting.
    expect(measureDistance(A, node('b', 100, 0, 50, 50))).toMatchObject({
      gapX: 0,
      overlap: null,
      direction: 'right',
    });
  });

  it('treats contact on the far side the same way', () => {
    // The mirror of the case above: B ends exactly where A begins.
    expect(measureDistance(A, node('b', -50, 0, 50, 50))).toMatchObject({
      gapX: 0,
      overlap: null,
      direction: 'left',
    });
    expect(measureDistance(A, node('b', 0, -50, 100, 50))).toMatchObject({
      gapY: 0,
      overlap: null,
      direction: 'above',
    });
  });

  it('reports overlap extents when the boxes intersect', () => {
    const m = measureDistance(A, node('b', 50, 25, 100, 50));

    expect(m.gapX).toBe(0);
    expect(m.gapY).toBe(0);
    expect(m.direction).toBe('overlapping');
    expect(m.overlap).toEqual({ width: 50, height: 25 });
  });

  it('does not report an overlap when the boxes merely share a full edge', () => {
    const m = measureDistance(A, node('b', 0, 50, 100, 50));
    expect(m.overlap).toBeNull();
    expect(m.gapY).toBe(0);
  });

  it('rounds a fractional gap to two decimals', () => {
    // Figma bounds are floats, so the reported value must not leak float noise.
    expect(measureDistance(A, node('b', 100.126, 0, 50, 50)).gapX).toBe(0.13);
    expect(measureDistance(A, node('b', 50.4, 25.3, 100, 50)).overlap).toEqual({
      width: 49.6,
      height: 24.7,
    });
  });
});

describe('measureDistance: alignment', () => {
  it('reports both shared edges and the shared centre of a same-size box', () => {
    const m = measureDistance(A, node('b', 0, 60, 100, 40));
    expect(m.alignments).toEqual(['left', 'right', 'centerX']);
  });

  it('reports top, bottom and centerY for a vertical counterpart', () => {
    const m = measureDistance(A, node('b', 200, 0, 100, 50));
    expect(m.alignments).toEqual(['top', 'bottom', 'centerY']);
  });

  it('does not infer a shared centre from shared edges of different widths', () => {
    // Right edges both at 100, but centres are 50 and 55 -- not aligned.
    const m = measureDistance(A, node('b', 10, 0, 90, 50));
    expect(m.alignments).toContain('right');
    expect(m.alignments).not.toContain('centerX');
  });

  it('does not infer a shared centre from shared bottoms of different heights', () => {
    // Centres are both 25, but the bottoms differ (50 vs 60).
    const m = measureDistance(A, node('b', 0, -10, 100, 70));
    expect(m.alignments).toContain('centerY');
    expect(m.alignments).not.toContain('bottom');
  });

  it('reports nothing when no edge lines up', () => {
    const m = measureDistance(A, node('b', 33, 77, 40, 40));
    expect(m.alignments).toEqual([]);
  });

  it('tolerates sub-pixel drift up to the documented half-pixel', () => {
    expect(measureDistance(A, node('b', 0.5, 60, 100, 40)).alignments).toContain('left');
    // A wider tolerance would report a visibly misaligned pair as aligned.
    expect(measureDistance(A, node('b', 0.6, 60, 100, 40)).alignments).not.toContain('left');
    expect(measureDistance(A, node('b', 2, 60, 100, 40)).alignments).not.toContain('left');
  });
});

describe('measureDistance: numerical sanity', () => {
  it('never emits a negative gap', () => {
    const cases = [
      node('b', 50, 25, 100, 50),
      node('b', 100, 0, 50, 50),
      node('b', -500, -500, 10, 10),
      node('b', 0, 0, 100, 50),
    ];

    for (const b of cases) {
      const m = measureDistance(A, b);
      expect(m.gapX).toBeGreaterThanOrEqual(0);
      expect(m.gapY).toBeGreaterThanOrEqual(0);
      expect(m.distance).toBeGreaterThanOrEqual(0);
    }
  });

  it('is symmetric in the gaps even though the direction flips', () => {
    const b = node('b', 130, 70, 40, 40);
    const forward = measureDistance(A, b);
    const backward = measureDistance(b, A);

    expect(backward.gapX).toBe(forward.gapX);
    expect(backward.gapY).toBe(forward.gapY);
    expect(backward.distance).toBe(forward.distance);
    expect(forward.direction).toBe('right');
    expect(backward.direction).toBe('left');
  });

  it('handles identical boxes as a pure overlap', () => {
    const m = measureDistance(A, node('b', 0, 0, 100, 50));
    expect(m.overlap).toEqual({ width: 100, height: 50 });
    expect(m.distance).toBe(0);
  });

  it('does not throw on a zero-size box', () => {
    expect(() => measureDistance(node('a', 0, 0, 0, 0), node('b', 0, 0, 0, 0))).not.toThrow();
    expect(measureDistance(node('a', 0, 0, 0, 0), node('b', 10, 0, 50, 50)).gapX).toBe(10);
  });

  it('reports overlapping without extents when a zero-size box sits inside another', () => {
    // Both axes intersect but the overlap has no area, so there is nothing to report as an
    // extent. `overlapping` is still the honest verdict -- there is no direction to give.
    const m = measureDistance(A, node('b', 50, 10, 0, 0));
    expect(m).toMatchObject({ direction: 'overlapping', gapX: 0, gapY: 0, overlap: null });
  });
});

describe('unionBounds', () => {
  it('spans both boxes so the diagram can scale to fit them', () => {
    expect(unionBounds({ x: 0, y: 0, width: 100, height: 50 }, { x: 120, y: 80, width: 40, height: 20 }))
      .toEqual({ x: 0, y: 0, width: 160, height: 100 });
  });

  it('works when the second box is the upper-left one', () => {
    expect(unionBounds({ x: 50, y: 50, width: 10, height: 10 }, { x: 0, y: 0, width: 20, height: 20 }))
      .toEqual({ x: 0, y: 0, width: 60, height: 60 });
  });

  it('is commutative, so argument order cannot change the frame', () => {
    const p = { x: 3, y: 9, width: 11, height: 4 };
    const q = { x: -2, y: 20, width: 7, height: 30 };
    expect(unionBounds(p, q)).toEqual(unionBounds(q, p));
  });
});
