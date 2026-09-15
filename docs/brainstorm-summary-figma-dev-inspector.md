# Brainstorm Summary: Figma Dev Inspector Plugin (Dev Mode Alternative for Free Accounts)

**Date:** 2026-09-15  
**Status:** Approved  
**Distribution:** Personal / Internal Team (Unpacked Plugin)

---

## 1. Problem Statement & Requirements
- **Problem:** Figma paywalled Dev Mode ($12–$25/seat/month). Free accounts (Viewers & Starter teams) lost the native Inspect panel: CSS snippets, Tailwind classes, 1-click color copying, visual box model, and fast SVG/PNG asset export.
- **Goal:** Build a lightweight, non-intrusive, high-performance Figma plugin that restores these core developer hand-off workflows for free users without requiring a paid Dev Mode license.
- **Constraints:**
  - Must run with `"editorType": ["figma"]` so free accounts can run it (Dev Mode editorType is paywalled).
  - Must run completely client-side in Figma's sandboxed iframe; zero external server dependencies.
  - Must support dynamic layer tracking (`figma.on('selectionchange')`).

---

## 2. Evaluated Approaches

| Criteria | Approach 1: React + Tailwind + Vite (Selected ⭐) | Approach 2: Preact + Tailwind + Vite | Approach 3: Vanilla TS + CSS |
| :--- | :--- | :--- | :--- |
| **DX & Maintainability** | High (Modular components, standard hooks) | High (JSX/hooks, slightly smaller ecosystem) | Low (Imperative DOM manipulation) |
| **Bundle Size** | ~180KB (single HTML file via singlefile plugin) | ~60KB | ~25KB |
| **UI State & Animations** | Easy (Toasts, Accordions, Tabs, Copy feedback) | Easy | Complex manual state & DOM syncing |
| **Extensibility** | High (Easy to add token mappings, frameworks) | Medium-High | Low (High refactoring overhead) |
| **Verdict** | **Best balance for clean UI & robust UX** | Alternative runner-up | Rejected due to high maintenance |

---

## 3. Recommended Technical Architecture

### 3.1 Stack
- **Build System:** Vite + `vite-plugin-singlefile` (compiles React + CSS + SVG assets into a single inline HTML string for Figma `showUI`).
- **Core Engine (Plugin Sandbox - `code.ts`):**
  - TypeScript, running in Figma quickjs VM.
  - Event listener: `figma.on('selectionchange', handleSelection)`.
  - Native CSS extraction: `node.getCSSAsync()`.
  - Node traversal: Fills, Strokes, Effects, Auto-layout properties, Constraints, Corner radii.
  - Asset export: `node.exportAsync({ format: 'SVG' | 'PNG' })`.
- **UI Layer (`ui.tsx`):**
  - React 18 + Tailwind CSS.
  - Theme: Auto-adapts to Figma UI3 Dark/Light mode (`figma.themeColors` / CSS variables).
  - Compact sidebar format: width 340px, height 580px (resizable or collapsible).

### 3.2 Feature Breakdown (MVP)

1. **⚡ Quick Color Copier:**
   - Detects all solid and linear/radial gradient fills and strokes of the selected node and its direct children.
   - Instant format display: HEX, RGBA, HSL.
   - 1-click click-to-copy with visual "Copied!" feedback badge.
2. **🔍 Inspect Code Viewer:**
   - **CSS Tab:** Cleaned, formatted CSS extracted directly via `getCSSAsync()`.
   - **Tailwind CSS Tab:** Custom AST/property converter mapping:
     - Layout: `flex`, `flex-row`/`flex-col`, `items-*`, `justify-*`, `gap-*`.
     - Sizing: `w-*`, `h-*` or arbitrary values `w-[...]`.
     - Spacing: `p-*`, `px-*`, `py-*`.
     - Visuals: `bg-[#...]`, `text-[#...]`, `rounded-*`, `border`, `shadow-*`.
   - 1-click "Copy All" button.
3. **📐 Box Model & Spacing Specs:**
   - Interactive visual diagram: Width × Height, Outer Margin/Offsets, Inner Padding (T/R/B/L), Gap.
   - Corner Radius readout (independent corner radii supported).
   - Layout mode indicator (Auto-layout Horizontal / Vertical / None).
4. **📦 1-Click Asset Export:**
   - **Copy SVG:** Fetches SVG string via `exportAsync({ format: 'SVG' })` and copies raw `<svg>` code directly into system clipboard (ready to paste into JSX/HTML).
   - **Download SVG / PNG @2x:** Exports binary blob and triggers immediate download without manual Figma export configuration.

---

## 4. Implementation Considerations & Risks

| Risk | Mitigation |
| :--- | :--- |
| `getCSSAsync()` failure on complex or unsupported nodes (e.g. empty groups, boolean ops) | Wrap with `try/catch`, fallback to manual property extraction (fills, bounds, strokes). |
| Performance lag on selecting large frames with thousands of children | Do shallow traversal (only selected node + direct level-1 children for colors); don't deep-traverse whole trees synchronously. |
| Clipboard copy restriction inside Figma iframe | Use modern `navigator.clipboard.writeText` with fallback to hidden `textarea.execCommand('copy')`. |
| Figma Community review risk | Positioned exclusively as local / unpacked plugin (`manifest.json` load direct in Figma). Zero risk of rejection. |

---

## 5. Success Metrics & Validation Criteria
1. Plugin launches in < 150ms inside Figma Desktop & Web.
2. Selection change latency is < 50ms for typical frames and components.
3. Accurate CSS properties matching Figma's internal rendering.
4. Tailwind class generator covers 90%+ standard layout and styling properties.
5. 1-click copy works reliably on all modern browsers and Figma desktop app.

---

## 6. Next Steps
1. Create detailed implementation plan (`/ck:plan`).
2. Scaffold project structure (Vite + React + Tailwind + Figma plugin typings).
3. Implement `code.ts` (Figma event bus, `getCSSAsync`, node parsers).
4. Implement UI components (BoxModel, ColorPalette, CodeViewer, QuickExport).
5. Build, bundle via `vite-plugin-singlefile`, and verify with live Figma test file.
