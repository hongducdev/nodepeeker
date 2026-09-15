---
phase: 1
title: "Setup"
status: pending
priority: P1
effort: "1h"
dependencies: []
---

# Phase 1: Setup & Project Scaffolding

## Overview
Initialize the project workspace with a modern build pipeline supporting both the Figma plugin sandbox runtime (`code.ts`) and the React 18 UI iframe bundled into a single HTML file via `vite-plugin-singlefile`.

## Requirements
- **Functional:**
  - Valid `manifest.json` configured with `"editorType": ["figma"]`, `"api": "1.0.0"`, `"main": "dist/code.js"`, and `"ui": "dist/index.html"`.
  - Configured scripts: `npm run dev` (watch mode) and `npm run build` (production singlefile bundle).
- **Non-functional:**
  - TypeScript strict mode enabled for both sandbox and UI code.
  - Zero external CDN dependencies in the final bundle (Figma iframe is offline-safe).

## Architecture
Two compilation targets:
1. `code.ts` compiled to `dist/code.js` via Vite library mode or `esbuild`/`tsc` targeting ES6 (compatible with Figma QuickJS engine).
2. `src/index.html` + `src/ui/main.tsx` compiled to a single self-contained `dist/index.html` via `vite-plugin-singlefile`.

## Related Code Files
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `manifest.json`
- Create: `src/code/code.ts`
- Create: `src/ui/index.html`
- Create: `src/ui/main.tsx`
- Create: `src/ui/styles.css`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`

## Implementation Steps
1. Create `package.json` with dependencies:
   - Dependencies: `react`, `react-dom`, `lucide-react`.
   - DevDependencies: `typescript`, `@types/react`, `@types/react-dom`, `@figma/plugin-typings`, `vite`, `@vitejs/plugin-react`, `vite-plugin-singlefile`, `tailwindcss`, `postcss`, `autoprefixer`.
2. Configure `tailwind.config.js` and `postcss.config.js` with Figma UI3 color palettes (slate, gray, accent blues).
3. Configure `vite.config.ts` with multi-input or paired builds:
   - Output `dist/index.html` (single file HTML with inlined JS & CSS).
   - Output `dist/code.js` (Figma plugin entrypoint).
4. Configure `manifest.json`:
   ```json
   {
     "name": "Dev Inspector (CSS & Tailwind)",
     "id": "figma-dev-inspector",
     "api": "1.0.0",
     "main": "dist/code.js",
     "ui": "dist/index.html",
     "editorType": ["figma"],
     "networkAccess": { "allowedDomains": ["none"] }
   }
   ```
5. Smoke test build command `npm run build` to confirm `dist/code.js` and `dist/index.html` exist without syntax errors.

## Success Criteria
- [ ] `npm run build` completes with 0 errors.
- [ ] `dist/index.html` is completely self-contained with no external CSS/JS script tags.
- [ ] `manifest.json` is recognized and valid when imported into Figma Desktop.

## Risk Assessment
- *Risk:* Figma sandbox does not support modern DOM APIs (e.g. `document`, `window`).
- *Mitigation:* Keep `src/code/code.ts` strictly isolated from UI code; communication happens solely via `figma.ui.postMessage`.
