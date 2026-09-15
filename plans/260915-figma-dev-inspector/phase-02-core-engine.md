---
phase: 2
title: "Core-Engine"
status: pending
priority: P1
effort: "2h"
dependencies: ["phase-01-setup"]
---

# Phase 2: Core Plugin Engine (Sandbox Runtime)

## Overview
Develop the backend logic in `src/code/code.ts` running inside Figma's plugin sandbox. It handles layer selection events (`figma.on('selectionchange')`), extracts layout, geometry, typography, and color metadata, invokes `node.getCSSAsync()`, and performs 1-click asset exports (`node.exportAsync`).

## Requirements
- **Functional:**
  - Initialize compact floating UI window: `figma.showUI(__html__, { width: 340, height: 580, themeColors: true })`.
  - Listen to `selectionchange` and transmit structured `NodeInspectionData` to UI.
  - Safely extract native CSS using `node.getCSSAsync()`.
  - Traverse fills/strokes to extract unique color tokens (HEX, RGB, HSL) from the selected node and its direct children.
  - Listen to messages from UI (`figma.ui.onmessage`) for on-demand asset export (`EXPORT_SVG`, `EXPORT_PNG`).
- **Non-functional:**
  - Safe error handling: never crash or throw uncaught errors on exotic node types (e.g. SLICE, BOOLEAN_OPERATION, empty groups).
  - Fast execution: throttle/debounce selection updates if user drags-selects multiple nodes.

## Architecture
```
Figma Selection Change
         │
         ▼
[ extractNodeData(selectedNode) ]
 ├── Basic info: id, name, type, bounds (w, h, x, y)
 ├── Layout info: layoutMode, padding (T/R/B/L), itemSpacing, primaryAxisAlign, counterAxisAlign
 ├── Corner radius: uniform cornerRadius or individual [tl, tr, br, bl]
 ├── Colors: extractColors(node) -> Set of { hex, rgb, hsl, opacity, name }
 ├── CSS: await node.getCSSAsync() (with try/catch fallback)
 └── figma.ui.postMessage({ type: 'INSPECT_RESULT', payload })
```

## Related Code Files
- Create: `src/types/messages.ts` (shared message schemas and data types)
- Create: `src/code/color-utils.ts` (RGB float to HEX, RGBA, HSL conversion)
- Create: `src/code/extractors.ts` (layout, geometry, and CSS extraction helpers)
- Modify: `src/code/code.ts` (main lifecycle and event listeners)

## Implementation Steps
1. Define TypeScript interfaces in `src/types/messages.ts`:
   - `ColorToken`: `{ hex: string, rgba: string, hsl: string, opacity: number, source: 'fill' | 'stroke' }`.
   - `BoxModelData`: `{ width: number, height: number, paddingTop: number, paddingRight: number, paddingBottom: number, paddingLeft: number, gap: number, cornerRadius: number | number[] }`.
   - `NodeInspectionData`: `{ id: string, name: string, type: string, css: Record<string, string>, colors: ColorToken[], boxModel: BoxModelData }`.
2. Implement color converters in `src/code/color-utils.ts`:
   - `rgbToHex(r: number, g: number, b: number): string`
   - `rgbToHsl(r: number, g: number, b: number): string`
   - Recursive/shallow scanner extracting all visible solid and gradient paint colors.
3. Implement `extractNodeData(node: SceneNode): Promise<NodeInspectionData>` in `src/code/extractors.ts`:
   - Inspect bounds and auto-layout attributes (`paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight`, `itemSpacing`).
   - Call `await node.getCSSAsync()` and format key-value pairs.
4. Implement UI message listeners in `src/code/code.ts`:
   - Handle `'REQUEST_EXPORT'`:
     - If format is SVG: call `await node.exportAsync({ format: 'SVG' })`, convert bytes to UTF-8 string, post back to UI to copy or download.
     - If format is PNG: call `await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 2 } })`, send binary payload to UI for browser download.
5. Handle edge cases: when 0 nodes or multiple nodes are selected, emit appropriate state messages (`NO_SELECTION`, `MULTI_SELECTION`).

## Success Criteria
- [ ] Selecting any Figma layer updates UI with correct node name, type, and dimensions.
- [ ] CSS returned from `getCSSAsync` matches values seen in Figma.
- [ ] Fills with opacity, linear gradients, and stroke colors correctly produce valid HEX/RGBA/HSL.
- [ ] `exportAsync` successfully sends SVG text and PNG byte arrays to UI.

## Risk Assessment
- *Risk:* `getCSSAsync()` throws on nodes with unsupported styles or detached components.
- *Mitigation:* Wrap in `try { ... } catch (err)` and provide fallback object computed from raw node properties.
