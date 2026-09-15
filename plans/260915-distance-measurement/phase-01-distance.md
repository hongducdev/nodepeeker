---
phase: 1
title: "Distance"
status: pending
priority: P1
effort: "3h"
dependencies: []
---

# Phase 1: Distance Measurement

## Overview

Support a two-node selection and report the gap between the two layers, in the panel.

## Requirements

- **Functional:**
  - `SelectionState` gains a `pair` case carrying a `DistanceMeasurement`.
  - Horizontal and vertical gaps; `0` means the boxes overlap on that axis.
  - Edge-to-edge distances in each direction, plus overlap extents when they intersect.
  - Edge alignment (left / right / top / bottom / centre on each axis).
  - A mini diagram positioning both boxes proportionally with the gap labelled.
- **Non-functional:**
  - The geometry is a pure function, unit-tested without a Figma runtime.
  - A node whose `absoluteBoundingBox` is `null` degrades to no measurement rather than throwing.

## Architecture

```
selection.length === 2
        │
        ├─ absoluteBoundingBox (A), absoluteBoundingBox (B)   ── null → no measurement
        ▼
measureDistance(boundsA, boundsB)   src/utils/distance.ts   (pure)
        ▼
SELECTION_CHANGE { kind: 'pair', measurement }
        ▼
DistancePanel  ── mini diagram + numeric readout + copy
```

### Geometry

With `A` and `B` as absolute rects and `y` growing downwards:

```
aRight = A.x + A.width        bRight = B.x + B.width
aBottom = A.y + A.height      bBottom = B.y + B.height

gapX = B.x >= aRight ? B.x - aRight : bRight <= A.x ? A.x - bRight : 0
gapY = B.y >= aBottom ? B.y - aBottom : bBottom <= A.y ? A.y - bBottom : 0
```

`gapX` and `gapY` are both zero when the boxes intersect **or merely touch**, so `direction`
is derived from a per-axis side (-1/0/1) rather than from the gap: a gap of `0` alone cannot
distinguish contact from intersection. Alignment compares edges within a sub-pixel tolerance,
because Figma bounds carry float noise.

## Related Code Files

- Create: `src/utils/distance.ts`
- Create: `src/ui/components/DistancePanel.tsx`
- Create: `tests/distance.test.ts`
- Create: `tests/distance-panel.test.ts`
- Modify: `src/types/messages.ts`
- Modify: `src/code/code.ts`
- Modify: `src/ui/App.tsx`

## Implementation Steps

1. `src/types/messages.ts`: `DistanceBounds`, `DistanceNode`, `DistanceMeasurement`; replace
   `SelectionState` with the `single` / `pair` / `none` union.
2. `src/utils/distance.ts`: `measureDistance(a, b)` returning gaps, edges, overlap and alignment.
3. `src/code/code.ts`: handle `selection.length === 2`, reading both `absoluteBoundingBox`
   values; keep the existing branches for 0, 1 and 3+.
4. `src/ui/components/DistancePanel.tsx`: mini diagram + readout.
5. `src/ui/App.tsx`: switch on `selection.kind`.
6. Tests for the geometry and the component.

## Success Criteria

- [ ] Two selected layers produce a measurement with both gaps.
- [ ] Overlapping layers report `0` gaps and overlap extents.
- [ ] Alignment is reported only for edges that actually line up.
- [ ] The diagram reflects the real relative position.
- [ ] Tests pass; typecheck clean; build succeeds.

## Risk Assessment

- *Risk:* the mini diagram misleads when the two boxes are far apart in scale (a tiny icon
  beside a huge frame).
  *Mitigation:* scale to the union and keep both boxes visible; the numbers are authoritative.
- *Risk:* `absoluteBoundingBox` is `null` for some nodes.
  *Mitigation:* measured only when both are present; otherwise the existing empty state shows.
- *Risk:* breaking the single-selection path while reshaping `SelectionState`.
  *Mitigation:* the compiler flags every consumer; the existing single-node tests must keep
  passing unchanged.
