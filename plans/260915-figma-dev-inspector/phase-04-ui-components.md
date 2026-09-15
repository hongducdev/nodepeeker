---
phase: 4
title: "UI-Components"
status: pending
priority: P1
effort: "3h"
dependencies: ["phase-02-core-engine", "phase-03-tailwind-transpiler"]
---

# Phase 4: UI Components & Compact Inspector View

## Overview
Build the complete user interface using React 18, Tailwind CSS, and Lucide icons. The UI runs inside a 340px-wide compact sidebar embedded in Figma's iframe, styled with Figma UI3 aesthetics and full dark/light theme support.

## Requirements
- **Functional:**
  - **Header & Node Meta:** Displays selected layer name, type badge (e.g. `FRAME`, `TEXT`, `COMPONENT`), dimensions pill (e.g. `320 × 48 px`).
  - **Box Model Widget:** An interactive, nested visual diagram:
    - Outer dimension: Width × Height.
    - Outer margins/offsets: X and Y coordinates.
    - Padding indicators: Top, Right, Bottom, Left.
    - Inner layout: Gap / spacing between child items.
    - Corner radius values (uniform or per-corner).
  - **Quick Color Copier:**
    - Swatches for all solid/gradient fills and strokes.
    - Format toggles: HEX (default), RGB, HSL.
    - Click anywhere on a color item to immediately copy value to clipboard.
  - **Code Inspector:**
    - Tab switcher: `[ Tailwind CSS ]` vs `[ Pure CSS ]`.
    - Clean code preview with monospace font and copy button.
    - "Copy Code" button with instant checkmark badge.
  - **1-Click Asset Export:**
    - "Copy SVG" button (copies raw `<svg>` markup to clipboard).
    - "Download SVG" button (triggers browser file download).
    - "Download PNG @2x" button (triggers 2x retina PNG download).
  - **Toast Notifications:** A floating badge ("Copied to clipboard!") appearing for 1.5s on any copy action.
  - **Empty State:** Clean placeholder screen when nothing is selected ("Select a layer to inspect properties").
- **Non-functional:**
  - Responsive down to 300px width.
  - Native feel: Figma UI3 color variables (`var(--figma-color-bg)`, `var(--figma-color-text)`).

## Architecture
```
[ App.tsx ]
 ├── [ Header.tsx ] (Layer title, Node type pill, W x H)
 ├── [ BoxModel.tsx ] (Visual diagram: W/H, Padding T/R/B/L, Gap, Radius)
 ├── [ ColorPalette.tsx ] (Swatches list, HEX/RGB/HSL copy buttons)
 ├── [ CodeViewer.tsx ] (Tabs: CSS / Tailwind, copy button, syntax block)
 ├── [ QuickExport.tsx ] (Copy SVG, Download SVG, Download PNG)
 └── [ Toast.tsx ] (Global floating copy feedback)
```

## Related Code Files
- Create: `src/ui/App.tsx`
- Create: `src/ui/components/Header.tsx`
- Create: `src/ui/components/BoxModel.tsx`
- Create: `src/ui/components/ColorPalette.tsx`
- Create: `src/ui/components/CodeViewer.tsx`
- Create: `src/ui/components/QuickExport.tsx`
- Create: `src/ui/components/Toast.tsx`
- Create: `src/ui/components/EmptyState.tsx`
- Create: `src/ui/hooks/useClipboard.ts`
- Create: `src/ui/hooks/useFigmaTheme.ts`

## Implementation Steps
1. Create `src/ui/hooks/useClipboard.ts`:
   - Robust copy utility: tries `navigator.clipboard.writeText`, falls back to temporary `textarea` creation for iframe security compliance.
   - Manages copy toast state (`copiedText`, `isCopied`).
2. Create `src/ui/components/Header.tsx`:
   - Shows layer icon based on node type (`Frame`, `Type`, `Component`, `Square`).
   - Truncates long layer names neatly with tooltip.
3. Create `src/ui/components/BoxModel.tsx`:
   - SVG or flex-based concentric rectangles showing Width x Height on top, Padding T/R/B/L in padding box, and Gap in center.
   - Click-to-copy on padding/gap values.
4. Create `src/ui/components/ColorPalette.tsx`:
   - Lists distinct colors. Each row shows:
     - Color swatch circle (supports solid color and linear gradient previews).
     - Color code (HEX/RGB/HSL toggleable).
     - Opacity indicator if < 100%.
     - One-click copy with instant tick animation.
5. Create `src/ui/components/CodeViewer.tsx`:
   - Tab bar for `Tailwind` vs `CSS`.
   - Scrollable code block with line wrapping.
   - Top-right copy action button.
6. Create `src/ui/components/QuickExport.tsx`:
   - Action buttons: [Copy SVG Code], [SVG File], [PNG @2x].
   - Emits `'REQUEST_EXPORT'` to Figma plugin sandbox via `parent.postMessage`.
7. Assemble all components in `src/ui/App.tsx`:
   - Listen for `message` events from `parent` (Figma sandbox).
   - Render `EmptyState` if `selection.length === 0`.
   - Render inspector panels with clean accordion or section dividers.

## Success Criteria
- [ ] UI renders cleanly inside 340px width without horizontal scrollbars.
- [ ] Clicking any color row copies the formatted color string to clipboard and shows toast.
- [ ] Clicking "Copy SVG" copies valid SVG code that pastes directly into text editors.
- [ ] Clicking "Download PNG" triggers browser download of the selected node image.
- [ ] Dark and light Figma modes render with readable contrast.

## Risk Assessment
- *Risk:* Clipboard write fails inside sandboxed iframe due to browser security restrictions.
- *Mitigation:* Implement standard fallback using `document.execCommand('copy')` on a temporary hidden DOM element when `navigator.clipboard` is restricted.
