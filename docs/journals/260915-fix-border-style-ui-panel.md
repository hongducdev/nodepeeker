# Journal: Dedicated Border Style UI Panel + Stroke Extraction Hardening

**Date:** 2026-09-15  
**Topic:** Fix "border style not visible" — dedicated Border panel, Box Model badge, and stroke-scoping correctness  
**Author:** AI Agent (`ck:fix`)  

---

## 1. Reported Issue

> "tôi chưa thấy phần hiển thị style border hiển thị"

Border **code** was being generated, but there was **no dedicated UI surface** for border/stroke style. Additionally, the extraction had correctness gaps that suppressed borders in real Figma documents.

---

## 2. Root Causes

| # | Root cause | Impact |
|---|---|---|
| 1 | No `BorderStyle` component existed; `BoxModel` rendered only Bounds → Padding → Content, omitting the border ring entirely | Users saw stroke *color* in the palette but never border *style* / *weight* / *alignment* |
| 2 | `extractors.ts` required `visibleStroke.type === 'SOLID'`; gradient/image strokes were dropped | Border silently absent for non-solid strokes |
| 3 | `strokeWeight` of `0` or `figma.mixed` on a stroked node produced no border record | Stroke color shown, border code missing |
| 4 | *(Introduced, then caught in review)* A `!border` fallback matched **child** stroke tokens from the recursive `extractColorsFromNode` scan | Borderless parent frames falsely reported a `1px` border |

---

## 3. Changes

### New: `src/ui/components/BorderStyle.tsx`
Dedicated **"Border & Stroke Style"** section rendered directly below the color palette:
- Live preview box painted with the real `borderTopWidth` / `borderRightWidth` / `borderBottomWidth` / `borderLeftWidth`, `borderStyle`, and `borderColor`.
- Header chips: weight (`T:0 R:1 B:0 L:0px` or `2px`), style (`solid` / `dashed` / `dotted`), alignment (`inside` / `outside` / `center`).
- Two quick-copy buttons — full **CSS** declaration block and **Tailwind** class string.

### `src/ui/components/BoxModel.tsx`
- Accepts an optional `border?: BorderData` prop.
- Renders an amber border badge beside the radius chip with a live color swatch.
- Badge and copy payload now correctly expand `individualWeights` (was showing `b: 0px` when per-side weights were set).

### `src/code/extractors.ts`
- Accepts **any** visible stroke type; non-solid strokes fall back to the extracted stroke color token.
- Defaults `strokeWeight` to `1` when a stroke exists but weight is `0` or mixed.
- Removed the child-token fallback that synthesized phantom borders on borderless parents (flagged by review).

### `src/ui/App.tsx`
- Wires `selection.data.border` into both `BoxModel` and the new `BorderStyle` panel.

---

## 4. Verification

- **Regression tests:** `tests/border-extraction.test.ts` (4 cases) — node-owned stroke produces a border; **parent with child-only strokes produces no border**; zero-weight defaults to 1px; `dashPattern` maps to dashed vs dotted.
- **Full suite:** 21/21 passed across 6 files.
- **TypeScript:** 0 errors.
- **Build:** `dist/code.js` 15.2 KB, `dist/index.html` 208.4 KB (gzip 61.1 KB).
