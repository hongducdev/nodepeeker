# Journal: Distance Measurement — Answering Dev Mode's Ruler Inside the Panel

**Date:** 2026-09-15  
**Topic:** Measure the gap between exactly two selected layers, and render it in the panel because a plugin has no canvas to draw on  
**Author:** AI Agent  

---

## 1. Context & Motivation

The inspector answers *what is this layer*. It did not answer *how far is this layer from that one* — the question Dev Mode's ruler answers by letting a designer select two layers and reading the gap off the canvas. Answering it required two decisions that were not obvious going in: **where the answer can be rendered at all**, and **what a two-node selection even means to the contract**.

---

## 2. The Constraint: A Plugin Cannot Draw on the Canvas

The feature exists in its rendered form because of what is *not* possible. A plugin's UI lives in an iframe, and Figma exposes no API for drawing an ephemeral overlay on the canvas — so Dev Mode's ruler, which is an overlay, cannot be reproduced. The other route, creating real measure nodes in the document, was rejected: it mutates the user's file and its undo history, and this plugin has been strictly read-only since its first commit.

So the measurement is computed in the sandbox and rendered **in the panel** as a mini diagram. This is not a fallback shape invented for this feature — `BoxModel` already draws the box model as nested boxes in the panel for exactly the same reason. Consistency here is the point: the panel already answers geometry questions visually, and a distance is one more of them.

---

## 3. Contract Change: `SelectionState` as a Discriminated Union

`SelectionState` was `{ selected: boolean; data: NodeInspectionData } | { selected: false; count: number }`. A two-node selection does not fit that shape, and padding it in as an optional field would have been the wrong fix: **a two-node selection is a different question from a one-node one.** One asks *what is this layer*; two asks *what is the relationship between these layers*. They have different payloads, different renderers, and different failure modes.

It is now a three-case union, and the question being asked is the discriminant:

```ts
export type SelectionState =
  | { kind: 'single'; data: NodeInspectionData }
  | { kind: 'pair'; measurement: DistanceMeasurement }
  | { kind: 'none'; count: number };
```

Routing in `src/code/code.ts` follows:

| Selection | Payload |
|---|---|
| exactly 2, both with `absoluteBoundingBox` | `{ kind: 'pair', measurement }` |
| exactly 2, either bounds `null` | `{ kind: 'none', count: 2 }` |
| exactly 1 | `{ kind: 'single', data }` (unchanged) |
| 0 or 3+ | `{ kind: 'none', count }` (unchanged) |

`measureSelection` returns `undefined` when either node's `absoluteBoundingBox` is `null` — Figma returns null for some node kinds, and a measurement needs both — and that case degrades to the ordinary "nothing to inspect" message rather than a half-measurement. `src/ui/App.tsx` renders `<DistancePanel>` only for `kind === 'pair'`.

---

## 4. Geometry: `src/utils/distance.ts`

The module is pure functions over `DistanceBounds` — no Figma types, no rendering, no I/O. Everything derives from `absoluteBoundingBox`, which is in canvas coordinates, so a measurement works **between layers in different frames**, not only between siblings:

- `measureDistance(a, b)` → `{ gapX, gapY, distance, direction, overlap, alignments }`.
- `distance` is the straight-line distance between the nearest edges (`Math.hypot` of the two gaps), `0` when the boxes intersect.
- `overlap` is the intersection extent, present **only when the boxes intersect on both axes** — touching on one axis is not an overlap.
- `alignments` lists edges that line up within a `0.5px` tolerance, since Figma's bounds carry float noise and equality here is never `===`.
- `unionBounds` is the union of both boxes, used to scale the diagram so both stay in frame.

### A. `direction` comes from a per-axis side, not from the gap

This is the load-bearing design decision in the module. `separation()` returns both a `gap` and a `side` (`-1 | 0 | 1`), and `direction` is derived from the **side**, not the gap:

> A gap of exactly `0` is ambiguous. It means either **touching** (a real side) or **intersecting** (`side === 0`, no direction to give).

An early implementation keyed `direction` off the gap, and therefore reported already-touching boxes as `overlapping` — a wrong answer rather than a missing one, in the most common case a designer would test (two boxes sharing an edge). The side is tracked separately precisely so the two readings of `0` stay distinguishable. A mutation flipping `bEnd <= aStart` to `<` in `separation` is caught by a dedicated test.

---

## 5. What Was Cut: `edges` and `DistanceNode.id`

Review and the tester independently reached the same verdict on `edges`, and both were right: **it had no consumer anywhere in `src/`**, and each of its four values was identical to the corresponding `gapX`/`gapY`. It was a restatement of numbers already in the payload. `DistanceNode.id` fell to the same standard — nothing read it. Both were dropped.

This is the same rule applied in the earlier output-fidelity work: **no field crosses the sandbox/UI boundary without a consumer.** A field that is merely derivable is not free — it is a second place for the two sides of the boundary to disagree, and a second thing to test.

---

## 6. The Diagram: Flooring Size Without Also Clamping Position

The mini diagram sizes each box as a percentage of the union, with a floor of **6% width / 12% height** so a tiny layer stays visible instead of collapsing to a hairline. The floor introduced a defect that review caught: it was applied to *size* but not to *position*. A floored box at the union's far edge rendered at `99% + 6%`, extended past the container, and was clipped away **entirely** by the `overflow-hidden` frame — a box that was supposed to be *made visible* disappeared, falsifying the function's own docstring.

The fix clamps position to `100 - size`:

```ts
left: `${Math.min(pct(box.x - union.x, union.width), 100 - width)}%`,
top:  `${Math.min(pct(box.y - union.y, union.height), 100 - height)}%`,
```

Browser-verified: the offending case now renders at `94% + 6%`, both inside the frame.

---

## 7. Verification

- **Tests:** 163 passed across 17 files; `npx tsc --noEmit` clean; `npm run build` succeeds.
- **The two-node routing in `src/code/code.ts` went from completely untested to covered**: the measurement payload (`tests/sandbox-protocol.test.ts`), `null` bounds degrading to `none`, and the 0 / 2 / 3-node cases.
- **Eight mutations that previously survived are now killed.** Two are worth naming:
  - `bEnd <= aStart` → `<` in `separation` (the touching-vs-overlapping distinction).
  - The panel's diagram coordinates, covered by per-box extraction with distinct values, so a swapped or misassigned box cannot pass.
- **The panel tests were rewritten, and the reason is worth recording.** The originals used `toContain` over flattened markup, which meant `toContain('0px')` matched *inside* `20px`; the horizontal and vertical rows could be **swapped with every test green**; and the direction sentence and the copy label were never asserted at all. They passed without testing the thing. The rewrite extracts each row by its own label and parses each box's style individually, with fixtures chosen so every asserted number is distinct — a design that makes the swap mutant fail rather than accidentally agree.
- **Browser-verified:** the clipped-box fix above.

---

## 8. Known Limitations

- **`absoluteBoundingBox` excludes stroke and effect overflow.** A designer measuring to a stroke edge may expect `absoluteRenderBounds` instead. Unverified against real Figma — the difference is documented here rather than resolved.
- **A zero-size layer inside another reports `overlapping` with no extent row.** Both axes intersect, so `overlapping` is the honest verdict, but the overlap has zero area and there is no extent to draw. The panel says nothing further, which is terse; it is not wrong.
