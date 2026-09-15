---
phase: 5
title: "Verification"
status: pending
priority: P2
effort: "1h"
dependencies: ["phase-01-setup", "phase-02-core-engine", "phase-03-tailwind-transpiler", "phase-04-ui-components"]
---

# Phase 5: Verification, End-to-End Testing & Packaging

## Overview
Perform comprehensive validation of the bundled plugin, execute build checks, test against realistic Figma design scenarios, and prepare user documentation for running the unpacked plugin in Figma Desktop and Web.

## Requirements
- **Functional:**
  - `npm run build` runs cleanly and generates:
    - `dist/code.js`
    - `dist/index.html` (singlefile bundled HTML)
  - Total bundle size remains under 250KB.
  - End-to-end verification across 5 design layer types:
    1. **Auto-layout Frame:** Flex direction, padding, gap, background color, corner radius.
    2. **Button Component:** Centered layout, padding, font styling, hover states if applicable.
    3. **Vector / Icon:** Path nodes, stroke color, SVG copy and download.
    4. **Text Layer:** Font family, weight, size, line-height, letter-spacing, text color.
    5. **Image / Card with Drop Shadow:** Corner radius, shadow specs, 2x PNG export.
- **Non-functional:**
  - Plugin startup latency under 150ms.
  - No uncaught console errors in Figma developer tools.

## Architecture
```
[ Build Output Verification ]
 ├── Check dist/code.js (valid JS, no unbundled imports)
 ├── Check dist/index.html (inlined styles, scripts, zero external network calls)
 └── Validate manifest.json schema
           │
           ▼
[ Functional Scenario Test Suite ]
 ├── Scenario 1: Auto-layout Frame (Verify Box Model & Flex classes)
 ├── Scenario 2: Color Copier (Verify HEX, RGB, HSL click-to-copy)
 ├── Scenario 3: Tailwind Transpiler (Verify accurate utility classes)
 ├── Scenario 4: Asset Export (Verify SVG markup & PNG download)
 └── Scenario 5: Edge Cases (No selection, multi-selection, group nodes)
```

## Related Code Files
- Create: `docs/installation-guide.md` (instructions for loading unpacked plugin into Figma)
- Verify: `dist/manifest.json` or root `manifest.json`
- Verify: `dist/code.js`
- Verify: `dist/index.html`

## Implementation Steps
1. Execute full production build:
   - Run `npm run build`.
   - Inspect `dist/` folder to verify `code.js` and `index.html` exist and contain all necessary code.
2. Validate Manifest Configuration:
   - Ensure paths in `manifest.json` accurately point to `dist/code.js` and `dist/index.html`.
3. Smoke Test Checklist:
   - Import plugin into Figma Desktop (`Plugins > Development > Import plugin from manifest...`).
   - Launch plugin: verify compact sidebar opens without lagging the canvas.
   - Select a Frame: verify BoxModel diagram shows correct Width, Height, Padding, and Gap.
   - Click a Color Swatch: verify "Copied to clipboard!" toast appears and clipboard contains valid HEX.
   - Switch between [Tailwind] and [CSS] tabs: verify code matches design specs.
   - Click "Copy SVG": paste into an editor and verify standard `<svg>` markup.
   - Click "Download PNG": verify browser saves 2x PNG file.
4. Prepare `docs/installation-guide.md` with step-by-step instructions and screenshots/hints for team members to install the plugin in under 1 minute.

## Success Criteria
- [ ] Build completes with 0 errors and 0 warnings.
- [ ] Plugin runs in Figma Desktop and Figma Web without permissions issues.
- [ ] All 4 core features (Color Copy, Inspect Code, Box Model, Asset Export) function smoothly.
- [ ] Installation guide is documented and clear.

## Risk Assessment
- *Risk:* Vite singlefile plugin inlines fonts or SVGs as overly large base64 strings.
- *Mitigation:* Use lightweight Lucide SVG icons and system fonts (`Inter`, `system-ui`) to keep HTML size minimal.
