# Journal: Code Selection and 8-Digit HEXA Alpha Color Support

**Date:** 2026-09-16  
**Topic:** Allow granular text selection/copying in the code inspector, and support 8-digit HEXA alpha color codes and Tailwind opacity  
**Author:** AI Agent (`ck:fix`)  

---

## 1. Context & User Requests

1. **Granular text selection in code blocks:**
   - Previously, `CodeHighlighter` applied `select-all` (`user-select: all`) across all code containers (CSS, SVG, Tailwind).
   - In addition, the `handleKeyDown` shortcut in `CodeViewer` intercepted `Ctrl+C` / `Cmd+C` unconditionally and invoked `onCopy(activeCode)`.
   - As a result, attempting to drag-select or copy any substring or property forced the selection of the entire code block ("cả cụm").

2. **HEX color codes with opacity (8-character HEXA alpha):**
   - For fills or strokes with opacity < 100%, the color palette was previously copying only the base 6-digit hex (`#1E66F5`), stripping the alpha information.
   - The user requested that hex color codes with reduced opacity include the alpha channel in 8-digit HEXA format (`#1E66F580`).

---

## 2. Technical Decisions & Solutions

### A. Granular Text Selection in Code Viewer (`src/ui/components/CodeHighlighter.tsx` & `CodeViewer.tsx`)
- Changed `select-all` to `select-text` (`user-select: text`) on CSS, SVG, and Tailwind code containers in `CodeHighlighter.tsx`, and added `select-text` to the container in `CodeViewer.tsx`.
- Ensured line numbers and color swatches remain `select-none` so copying multi-line code never includes line number numbers or phantom swatch tokens.
- Updated `handleKeyDown` in `CodeViewer.tsx`: if `window.getSelection()?.toString()` has content, the plugin does not intercept `Ctrl+C` / `Cmd+C`, letting native browser copy copy the highlighted text. When no text is selected, the shortcut still copies the active tab's full code as before.

### B. 8-Digit HEXA Alpha Codes (`src/utils/color.ts` & `src/ui/components/ColorPalette.tsx`)
- Added pure utility function `toHex8(hex: string, opacity: number): string` in `src/utils/color.ts`:
  - Clamps opacity to `[0, 1]`.
  - Converts opacity to 2-digit uppercase hex (`Math.round(opacity * 255).toString(16).padStart(2, '0').toUpperCase()`).
  - Returns `#RRGGBBAA` for `opacity < 1`, and `#RRGGBB` for `opacity >= 1`.
- In `ColorPalette.tsx`:
  - In `HEX` format mode, if `c.opacity < 1`, returns `toHex8(c.hex, c.opacity)` (e.g. `#1E66F580`).
  - Retains the human-readable `{Math.round(c.opacity * 100)}%` badge next to the hex code.
  - Clicking to copy copies the exact 8-character HEXA code.
- Added `hsla(...)` support to `rgbToHsl` in `src/code/color-utils.ts` when opacity is < 1.

### C. Opacity Support in Tailwind Transpiler (`src/utils/tailwind-transpiler.ts`)
- Appends `/${Math.round(opacity * 100)}` to Tailwind color classes when fill, text, or stroke has `opacity < 1` (e.g., `bg-[#1E66F5]/50`, `text-[#EF4444]/75`, `border-[#10B981]/25`).

---

## 3. Verification & Tests

- Added tests in `tests/code-highlighter.test.ts` and `tests/code-viewer.test.ts` asserting `select-text` and absence of `select-all`.
- Added tests in `tests/color-palette.test.ts` verifying 8-digit HEXA alpha output (`#1E66F580`, `#EF4444CC`), `toHex8` edge cases, and empty state handling.
- Added tests in `tests/tailwind-transpiler.test.ts` verifying Tailwind opacity suffixes.
- All 194 unit tests passing, typecheck passing, production build succeeded.
