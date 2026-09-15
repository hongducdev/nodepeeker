# Journal: Output Fidelity — Faithful Tailwind and a Lazily Exported SVG

**Date:** 2026-09-15  
**Topic:** Fix six defects where generated output was wrong or silently incomplete, and stop exporting vector markup nobody asked for  
**Author:** AI Agent  

---

## 1. Context & Motivation

For a Dev Mode replacement, wrong output is worse than a missing feature: developers trust what the panel shows and paste it. An audit found six such defects — one architectural, five where a value Figma already knew was dropped or invented on the way out.

| # | Defect | Where |
|---|---|---|
| 1 | `exportAsync({format:'SVG'})` ran on **every** `selectionchange`, even when the SVG tab was never opened | `extractNodeData` |
| 2 | `opacity` was captured **inside** the `if (dropShadow)` branch — a translucent shadowless node lost it entirely | `extractNodeData` |
| 3 | `shadowType` was hardcoded `'md'` regardless of the real shadow — fabricated output | `extractNodeData` |
| 4 | `lineHeight` and `letterSpacing` were extracted but never read by the transpiler — dead payload | `TypographyData` vs `tailwind-transpiler.ts` |
| 5 | Hug/Fill sizing modes were unmapped and `layoutAlign` was extracted but unused | sizing bucket |
| 6 | Absolute positioning was never surfaced at all | not extracted |

Defect 1 is the architectural one: the export is the single most expensive thing the sandbox does, it was paid unconditionally, and its result was payload that most visits never rendered.

---

## 2. Phase 1 — Paying Down the Architectural Debt

### A. SVG moves to on-demand fetching (`src/code/extractors.ts`, `src/ui/App.tsx`)

`extractNodeData` no longer calls `exportAsync`. The SVG is requested only when the tab is actually opened, over the **existing** `REQUEST_EXPORT` protocol rather than a new message type: `{ format: 'SVG', action: 'view' }`. The sandbox answers with `EXPORT_RESULT`, whose payload now carries `nodeId` and echoes `action`, so a response can be matched to the node that asked for it. The `copy` and `download` actions are unchanged.

The UI keeps one cached markup value alongside the node id it belongs to, so a response arriving after the user has already clicked elsewhere is **rejected** rather than displayed against the wrong layer.

### B. `effects` → `shadows: ShadowData[]` (`src/types/messages.ts`)

A `hasDropShadow` boolean plus a fabricated `shadowType` cannot describe a multi-layer shadow, so the field was replaced rather than extended. `ShadowData` carries what Figma actually reports: `inner`, `offsetX`, `offsetY`, `blur`, `spread`, `color`, `opacity`. Only `DROP_SHADOW` / `INNER_SHADOW` effects are collected, hidden effects are skipped.

### C. `opacity` is hoisted to the top level

A node's opacity is independent of its shadows. It is now read on its own, and reported as `undefined` when fully opaque so the transpiler has nothing to emit.

---

## 3. Phase 2 — Output Fidelity

### A. Real shadows instead of a guess (`src/utils/tailwind-scale.ts`)

`toTailwindShadow` emits the exact geometry as one Tailwind arbitrary value:

```css
shadow-[0px_4px_8px_2px_rgba(0,0,0,0.25)]
```

**Arbitrary syntax here is a deliberate choice, not a shortcut.** `shadow-md` is a guess about a value Figma knows exactly, and the codebase already falls back to bracket values everywhere a scale does not have an exact match (`w-[123.45px]`, `rounded-[5px]`). Inner shadows get the `inset_` prefix; spaces become underscores per Tailwind's escaping rules; multiple layers are comma-joined inside a single bracket pair, because two `shadow-*` classes would collide. The fabricated `shadow-md` is gone, and a node with no shadows now emits no shadow utility at all.

### B. Typography: `leading-*` and `tracking-*`

`toTailwindLineHeight` accepts Figma's `${n}px` or `${n}%`: percent becomes a unitless ratio (`150%` → `leading-[1.5]`), pixels stay pixels. `toTailwindLetterSpacing` treats percent as `em`, which is what percent letter spacing means relative to font size (`5%` → `tracking-[0.05em]`). Zero tracking is dropped as the default, but negative tracking is preserved — it is meaningful.

### C. Sizing and position

- Hug on either axis replaces the explicit dimension on that axis: `w-fit` / `h-fit`.
- `layoutAlign === 'STRETCH'` (auto-layout "Fill container") → `self-stretch`; `layoutGrow === 1` still → `flex-1`.
- A child with `layoutPositioning: 'ABSOLUTE'` → `absolute left-[…px] top-[…px]`, emitted into the layout group so the offset reads next to the positioning it modifies.
- Node opacity → `opacity-*`, using the stepped scale when it matches exactly and arbitrary syntax otherwise.

`sizing` is mapped onto the **physical** axis from `primaryAxisSizingMode` / `counterAxisSizingMode`, since the primary axis is the layout direction and therefore means a different physical axis in a row than in a column.

---

## 4. Conditional Simplify Pass

The diff breached the 420 LOC / 10 file thresholds, so a simplify pass ran. It was verified **behaviour-preserving** by reading each reduction back rather than trusting the tooling — including confirming that the restructured padding branch still emits nothing for a zero-padding node, which is exactly the kind of rewrite where a `> 0` guard quietly goes missing.

---

## 5. Defects Found in Review and Fixed

Both live in the new lazy-SVG state machine (`src/ui/App.tsx`), and both are consequences of it being a state machine at all.

1. **Unbounded re-request loop after `EXPORT_ERROR`.** The failure path cleared the request marker. The fetch effect in `CodeViewer` lists `isSvgLoading` as a dependency, and `EXPORT_ERROR` sets it to `false` — so the cleared marker made the effect immediately re-request the same export, forever, with one blocking `alert()` per iteration. The marker is now deliberately left armed on failure, with a comment saying why.
2. **Marker never invalidated when the selection moved.** A node whose request had been issued kept its marker across a selection change, so returning to it never refetched and its SVG tab could show the empty placeholder permanently. The marker now resets whenever the selected node id changes — which also gives a failed fetch one retry on the next visit.

---

## 6. Known Issue, Deliberately Not Fixed

`EXPORT_ERROR` reports through a modal `alert()`, which blocks the plugin iframe until it is dismissed. It is real, it is user-visible, and it is out of scope here: replacing it with the toast the rest of the UI already uses is a UI change, not a fidelity fix. Recorded so the next pass does not rediscover it.

---

## Verification

- **Tests:** 69 passed across 10 files (`npx vitest run`). New coverage: `tests/output-fidelity.test.ts` (extraction of opacity/shadows/sizing/position, and each new emitted class) and `tests/sandbox-protocol.test.ts` (the `view` action answers with markup and echoes `nodeId`; `EXPORT_ERROR` on no selection and on a throwing export).
- **Mutation-tested the key assertions:** removing the `nodeId` echo and hardcoding the export action each fail the tests that should catch them, so those assertions are load-bearing rather than decorative.
- **Browser-verified in a real Figma run:** a selection change triggers **0** export requests; opening the SVG tab triggers exactly **1**; after an `EXPORT_ERROR` it stays at **1** — the loop is genuinely gone, not merely untested.
- **TypeScript:** `npx tsc --noEmit` — 0 errors.
- **Build:** `npm run build` succeeds.
- **Contract:** both threads still target `es2020`, no new runtime dependency, `networkAccess.allowedDomains` still `["none"]`.
