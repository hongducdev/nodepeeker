/**
 * Gap measurement between two layers, in the spirit of Dev Mode's ruler.
 *
 * A plugin cannot draw an overlay on the canvas, so the geometry is computed here and
 * rendered in the panel. Everything is derived from `absoluteBoundingBox`, which is in canvas
 * coordinates -- so this works between layers in different frames, not just siblings.
 */

export interface DistanceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DistanceNode {
  name: string;
  bounds: DistanceBounds;
}

/** Which way B sits relative to A. */
export type RelativeDirection = 'right' | 'left' | 'below' | 'above' | 'overlapping';

/** Edges that line up between the two boxes, within sub-pixel tolerance. */
export type Alignment = 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY';

export interface DistanceMeasurement {
  a: DistanceNode;
  b: DistanceNode;
  /** Horizontal separation. `0` means they overlap or touch on the horizontal axis. */
  gapX: number;
  /** Vertical separation. `0` means they overlap or touch on the vertical axis. */
  gapY: number;
  /** Straight-line distance between the nearest edges. `0` when they intersect. */
  distance: number;
  direction: RelativeDirection;
  /** Present only when the boxes intersect. */
  overlap: { width: number; height: number } | null;
  alignments: Alignment[];
}

/** Figma bounds carry float noise, so edge equality is a tolerance, not `===`. */
const EPSILON = 0.5;

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Separates two intervals on one axis. `side` is `0` when they intersect, `1` when the second
 * starts after the first ends, `-1` when it ends before the first starts.
 *
 * The side is tracked separately from the gap because a gap of exactly `0` is ambiguous: it
 * means either "touching" (a real side) or "overlapping" (`side === 0`).
 */
function separation(
  aStart: number,
  aSize: number,
  bStart: number,
  bSize: number
): { gap: number; side: -1 | 0 | 1 } {
  const aEnd = aStart + aSize;
  const bEnd = bStart + bSize;
  if (bStart >= aEnd) return { gap: round(bStart - aEnd), side: 1 };
  if (bEnd <= aStart) return { gap: round(aStart - bEnd), side: -1 };
  return { gap: 0, side: 0 };
}

function overlapExtent(aStart: number, aSize: number, bStart: number, bSize: number): number {
  const extent = Math.min(aStart + aSize, bStart + bSize) - Math.max(aStart, bStart);
  return extent > 0 ? round(extent) : 0;
}

function alignmentsOf(a: DistanceBounds, b: DistanceBounds): Alignment[] {
  const found: Alignment[] = [];
  if (Math.abs(a.x - b.x) <= EPSILON) found.push('left');
  if (Math.abs(a.x + a.width - (b.x + b.width)) <= EPSILON) found.push('right');
  if (Math.abs(a.y - b.y) <= EPSILON) found.push('top');
  if (Math.abs(a.y + a.height - (b.y + b.height)) <= EPSILON) found.push('bottom');
  if (Math.abs(a.x + a.width / 2 - (b.x + b.width / 2)) <= EPSILON) found.push('centerX');
  if (Math.abs(a.y + a.height / 2 - (b.y + b.height / 2)) <= EPSILON) found.push('centerY');
  return found;
}

function directionOf(sideX: -1 | 0 | 1, sideY: -1 | 0 | 1): RelativeDirection {
  if (sideX === 1) return 'right';
  if (sideX === -1) return 'left';
  if (sideY === 1) return 'below';
  if (sideY === -1) return 'above';
  return 'overlapping';
}

export function measureDistance(a: DistanceNode, b: DistanceNode): DistanceMeasurement {
  const sepX = separation(a.bounds.x, a.bounds.width, b.bounds.x, b.bounds.width);
  const sepY = separation(a.bounds.y, a.bounds.height, b.bounds.y, b.bounds.height);

  // Only an intersection on BOTH axes is an overlap; touching on one axis is not.
  const overlapW = overlapExtent(a.bounds.x, a.bounds.width, b.bounds.x, b.bounds.width);
  const overlapH = overlapExtent(a.bounds.y, a.bounds.height, b.bounds.y, b.bounds.height);
  const overlap = overlapW > 0 && overlapH > 0 ? { width: overlapW, height: overlapH } : null;

  return {
    a,
    b,
    gapX: sepX.gap,
    gapY: sepY.gap,
    distance: round(Math.hypot(sepX.gap, sepY.gap)),
    direction: directionOf(sepX.side, sepY.side),
    overlap,
    alignments: alignmentsOf(a.bounds, b.bounds),
  };
}

/** Union of both boxes, used to scale the diagram so both stay visible. */
export function unionBounds(a: DistanceBounds, b: DistanceBounds): DistanceBounds {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}
