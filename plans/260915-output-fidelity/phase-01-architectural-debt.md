---
phase: 1
title: "Architectural-Debt"
status: completed
priority: P1
effort: "2h"
dependencies: []
---

# Phase 1: Architectural Debt

## Overview

Fix three structural problems that make every subsequent feature more expensive. No new
user-facing capability; this phase makes the payload smaller, the selection loop faster,
and removes a latent bug plus dead data.

## Requirements

- **Functional:**
  - SVG markup is fetched **only** when the user opens the SVG tab, and cached per node.
  - Node `opacity` is captured independently of shadows.
  - `lineHeight` / `letterSpacing` are either consumed or removed (no dead payload).
- **Non-functional:**
  - Payload for `SELECTION_CHANGE` must not carry vector markup.
  - No regression in the existing single-selection flow.

## Architecture

### Lazy SVG

```
before:  selectionchange -> extractNodeData -> exportAsync(SVG) -> SELECTION_CHANGE{...,svg}
after:   selectionchange -> extractNodeData -> SELECTION_CHANGE{...no svg}
         UI opens SVG tab -> REQUEST_EXPORT{format:'SVG', action:'view'}
                          -> exportAsync(SVG) -> EXPORT_RESULT{action:'view'} -> UI cache
```

`action: 'view'` is added to the existing `REQUEST_EXPORT` union and to the `EXPORT_RESULT`
payload union, reusing the established protocol instead of adding a parallel message type.

### Contract changes (`src/types/messages.ts`)

- Remove `svg?: string` from `NodeInspectionData`.
- Remove `effects?: {...}`; add `shadows?: ShadowData[]` and top-level `opacity?: number`.
- Add `'view'` to the `action` unions.

## Implementation Steps

1. Update `src/types/messages.ts`: add `ShadowData`, drop `effects` and `svg` from
   `NodeInspectionData`, add `opacity`, widen the `action` unions with `'view'`.
2. Update `src/code/extractors.ts`: remove the `exportAsync` block; extract `opacity`
   unconditionally; extract a real `shadows` array.
3. Update `src/code/code.ts`: handle `action: 'view'` on `REQUEST_EXPORT` (returns
   `EXPORT_RESULT` with the SVG string, no clipboard/download side effect).
4. Update `src/ui/App.tsx`: hold `svgContent` + `svgNodeId`; clear on node change; request
   on demand; store on `action: 'view'`.
5. Update `src/ui/components/CodeViewer.tsx`: request the SVG when the SVG tab is opened
   and content is absent; show a loading state.

## Success Criteria

- [x] Changing selection performs no vector export.
- [x] Opening the SVG tab populates it on demand.
- [x] A translucent shadowless node reports its opacity.
- [x] No field crosses the IPC boundary without a consumer.

## Risk Assessment

- *Risk:* the SVG tab now has a load state, so a slow export could look broken.
- *Mitigation:* explicit placeholder text while pending, and cache per node id so
  revisiting a tab is instant.
