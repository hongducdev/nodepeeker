# Journal: Post-Research Defect Cleanup

**Date:** 2026-09-15  
**Topic:** Fix 4 defects surfaced during AGENTS.md research  
**Author:** AI Agent

Four defects were identified by the parallel research scouts that produced `AGENTS.md`, then fixed in sequence.

---

## 1. Missing message discriminant on the extraction-failure path

**File:** `src/code/code.ts`

The `catch` branch of `handleSelectionChange` posted `{ payload: {...} }` with no `type` field. `App.tsx` switches on `msg.type`, so the fallback was silently discarded and the panel kept rendering the previous node. It compiled because `figma.ui.postMessage` is typed `any`.

**Fix:** added `type: 'SELECTION_CHANGE'` and dropped the unused `catch (err)` binding. `dist/code.js` now contains 4 `SELECTION_CHANGE` occurrences (was 3).

---

## 2. Figma font style names containing spaces

**File:** `src/utils/tailwind-scale.ts`

`toTailwindFontWeight` substring-matched against a raw lowercased string. Figma reports styles as `"Semi Bold"` / `"Extra Light"`, so `includes('semibold')` was false and the value collapsed to `font-bold`.

**Fix:** normalize with `replace(/[^a-z0-9]/g, '')` before matching. Specific weights are still tested before broad ones, so `"Extra Bold Italic"` → `font-extrabold`, not `font-bold`.

---

## 3. Tautological test with zero real coverage

**File:** `tests/code-highlighter.test.ts`

The file imported nothing from `src/`. It re-implemented tokenization over string literals and asserted on `Array`/`String` built-ins, providing no safety net for `CodeHighlighter.tsx` despite its name.

**Fix:** rewritten to render the real component with `renderToStaticMarkup` (via `React.createElement`, keeping the file `.ts`). Now asserts line numbering, property/value tokenization, hex swatches, comment handling, and Tailwind token families. 6 tests.

---

## 4. Stale README project structure tree

**File:** `README.md`

The tree omitted `plans/`, `docs/journals/`, `tests/`, `AGENTS.md`, `postcss.config.js`, `vitest.config.ts`, `src/ui/index.html`, and the `BorderStyle.tsx` / `CodeHighlighter.tsx` components.

**Fix:** tree regenerated from the actual filesystem.

---

## Verification

- **Tests:** 32/32 passed across 7 files (was 21 across 6).
- **Regression proof:** reverting fix #2 alone fails 2 of the new `tailwind-scale` tests; restoring passes all 7.
- **TypeScript:** 0 errors.
- **Build:** `dist/code.js` and `dist/index.html` regenerated; both fixes confirmed present in the emitted bundles.
- **`AGENTS.md`** updated so its coverage table, known-gaps section, and font-weight trap note remain factually accurate.
