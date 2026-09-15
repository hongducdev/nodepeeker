# Journal: Border Style Extraction & Generation in Code Viewer

**Date:** 2026-09-15  
**Topic:** Add Border Style Generation to Pure CSS & Tailwind Code Inspection  
**Author:** AI Agent (`ck:fix`)  

---

## 1. Issue & Motivation

When inspecting Figma elements with strokes, the color palette displayed the stroke color token, but the code inspection block (both Pure CSS and Tailwind) lacked complete border styles (e.g. `border: 1px solid #...`, `border-2`, `border-dashed`, or individual side borders like `border-b`). Developers required border styling to be rendered directly within the code views.

---

## 2. Technical Decisions & Solutions

1. **Type Contract (`src/types/messages.ts`):**
   - Added `BorderData` interface:
     - `strokeWeight`: uniform border thickness
     - `individualWeights`: per-side `{ top, right, bottom, left }`
     - `strokeStyle`: `'solid' | 'dashed' | 'dotted'` derived from `dashPattern`
     - `strokeAlign`: `'INSIDE' | 'OUTSIDE' | 'CENTER'`
     - `color`: hex color of visible stroke
   - Added `border?: BorderData` to `NodeInspectionData`.

2. **Extraction Engine (`src/code/extractors.ts`):**
   - Inspects `node.strokes` for visible solid strokes.
   - Extracts uniform `strokeWeight` and individual side weights (`strokeTopWeight`, etc.).
   - Converts `dashPattern` to CSS stroke styles (`dashed` / `dotted`).
   - Populates `css['border']` or per-side `css['border-top']` etc., guaranteeing standard CSS border rules even if Figma's `getCSSAsync()` omits them.

3. **Tailwind Transpiler (`src/utils/tailwind-transpiler.ts`):**
   - Maps uniform weights (`border`, `border-2`, `border-4`, `border-8`, or `border-[Xpx]`).
   - Maps individual sides (`border-t`, `border-b-2`, etc.).
   - Emits `border-dashed` / `border-dotted` when dashed strokes are applied.
   - Emits `border-[${color}]`.

4. **UI Code Viewer (`src/ui/components/CodeViewer.tsx`):**
   - Defense-in-depth fallback formatting in `formatCss()` ensuring border styles are always generated.

---

## 3. Verification & Metrics

- **Unit Tests:** 17/17 passed (`tests/border.test.ts` added covering uniform, individual, arbitrary weights, and dashed styles).
- **TypeScript:** 0 type errors (`tsc --noEmit`).
- **Production Build:** Successfully generated singlefile bundle (`npm run build`).
- **Code Review:** Score 10/10 from `BorderReviewer` subagent.
