# Journal: Default CSS, Syntax Highlighting & Keyboard Shortcuts

**Date:** 2026-09-15  
**Topic:** Switch to Pure CSS by default, Code Syntax Highlighting, and Keyboard Shortcuts / Quick Launch  
**Author:** AI Agent (`ck:fix`)  

---

## 1. Context & Motivation

Developers requested three core ergonomic improvements to the Figma Dev Inspector plugin:
1. **Default to Pure CSS:** For immediate styling inspections, standard CSS declarations are preferred as the primary active tab over Tailwind CSS.
2. **Code Syntax Highlighting:** Pure text `<pre>` blocks lacked visual hierarchy; token highlighting for properties, values, units, hex colors, and Tailwind utility classes was needed.
3. **Keyboard Shortcuts & Quick Launch:** Enabling users to open and navigate the plugin rapidly without cumbersome menu clicks.

---

## 2. Technical Decisions & Solutions

### A. Default to Pure CSS
- In `src/ui/components/CodeViewer.tsx`, changed default active tab state to `'css'`.
- Re-ordered the tab switcher so **[ CSS (1) ]** is the first tab, followed by **[ Tailwind (2) ]**.

### B. Custom Offline Syntax Highlighter
- Created `src/ui/components/CodeHighlighter.tsx` with zero external dependencies to preserve offline sandbox security (`allowedDomains: ["none"]`).
- **CSS Highlighting:**
  - Distinct token coloring for property names (`text-sky-400`), colons/semicolons (`text-slate-500`), units/numbers (`text-emerald-400`), keywords (`text-indigo-300`), and hex color tokens (`text-amber-300`).
  - Interactive live color preview chips next to hex codes.
  - Clean line numbering on the left with line hover accents.
- **Tailwind Highlighting:**
  - Token badges categorized by utility family: Layout (`text-purple-400`), Sizing (`text-sky-400`), Spacing (`text-emerald-400`), Typography (`text-pink-400`), Colors (`text-amber-300`), Borders/Radii (`text-teal-400`), and Effects (`text-indigo-400`).

### C. Keyboard Shortcuts & Figma Relaunch
- **Figma Global Relaunch:**
  - Added `relaunchButtons` in `manifest.json`.
  - Added `figma.root.setRelaunchData({ open: 'Inspect CSS & Tailwind' })` in `src/code/code.ts`. Layers now display an instant 1-click relaunch button in Figma's right-hand sidebar.
- **Figma Desktop Shortcut:** Documented `Ctrl + Alt + P` (Windows) / `Cmd + Option + P` (Mac) ("Run Last Plugin") and `Shift + I` (Plugins drawer) across UI tooltips and documentation.
- **In-Plugin Shortcuts:**
  - `1` or `C`: Switch to CSS.
  - `2` or `T`: Switch to Tailwind.
  - `Ctrl + C` / `Cmd + C`: Copy active code.
  - Interactive shortcut popover added to `Header.tsx`.

---

## 3. Verification & Results

- **Unit Tests:** 11/11 tests passing (`vitest run`).
- **TypeScript:** 0 type errors (`tsc --noEmit`).
- **Bundle Verification:** Production build generated cleanly under 202 KB (`dist/index.html`).
