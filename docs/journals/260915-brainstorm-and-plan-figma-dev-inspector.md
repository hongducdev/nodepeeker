# Journal: Brainstorming & Planning - Figma Dev Inspector Plugin

**Date:** 2026-09-15  
**Topic:** Architectural Decision & Implementation Planning for Free Dev Mode Alternative in Figma

## Key Decisions & Context
1. **Paywall Bypass Reality Check:**
   - Figma Dev Mode is strictly paywalled; declaring `"editorType": ["dev"]` blocks free accounts from executing the plugin.
   - Solution: Run as standard Figma plugin (`editorType: ["figma"]`) with a 340px compact floating inspector UI. Fully functional for free Viewers and Editors.
2. **Tech Stack Selection:**
   - Chose **React 18 + Tailwind CSS + Vite + `vite-plugin-singlefile`** over Vanilla TS and Preact.
   - Balances modern component DX, fast state transitions (toasts, tabs, copy states), and single-file HTML bundle generation for Figma's sandbox iframe.
3. **Core MVP Scope:**
   - Quick Color Copier (HEX, RGBA, HSL 1-click copy).
   - Inspect Code Viewer (CSS via `node.getCSSAsync()` + custom Tailwind v3/v4 Transpiler).
   - Visual Box Model Diagram (Width, Height, Padding T/R/B/L, Gap, Corner Radius).
   - 1-Click Asset Exporter (Raw SVG markup copy + 2x PNG download).
4. **Planning Structure:**
   - 5 execution phases created under `plans/260915-figma-dev-inspector/`.
   - Setup -> Core Engine -> Tailwind Transpiler -> UI Components -> Verification.

## Impact & Next Steps
- Ready for implementation execution via `/ck:cook plans/260915-figma-dev-inspector/plan.md`.
