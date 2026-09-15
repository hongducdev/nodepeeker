---
phase: 1
title: "Node-Link"
status: completed
priority: P1
effort: "2h"
dependencies: []
---

# Phase 1: Node Link

## Overview

Deliver a compact link bar under the header that shows the deep link to the selected node
and copies it on click, falling back to the node ID when `figma.fileKey` is unavailable.

## Requirements

- **Functional:**
  - A one-time `FILE_CONTEXT` message carries `fileKey` (optional) and `fileName`.
  - A pure `buildNodeUrl(fileKey, fileName, nodeId)` returns the deep link or `null`.
  - The bar shows the URL, truncated, with a copy affordance and the standard toast.
  - Without a key: show the node ID plus a one-line reason.
- **Non-functional:**
  - No layout shift when the link appears (reserve the row).
  - The bar must not push the code viewer out of the initial viewport.

## Architecture

```
sandbox (once)          ──► FILE_CONTEXT {fileKey?, fileName}
                                     │
UI: App.tsx holds fileContext        │
                                     ▼
                    NodeLink(nodeId, fileKey, fileName)
                            │
                    buildNodeUrl(...)  src/utils/node-link.ts   (pure)
                            │
                 url ? show url : show nodeId + reason
```

### URL shape

```
https://www.figma.com/design/<fileKey>/<sanitised-file-name>?node-id=<nodeId with ':' → '-'>
```

Figma keys off `fileKey` and normalises the name segment, so the name is cosmetic; the
`node-id` parameter is what selects the layer. Sanitising keeps the string safe to copy.

## Related Code Files

- Create: `src/utils/node-link.ts`
- Create: `src/ui/components/NodeLink.tsx`
- Create: `tests/node-link.test.ts`
- Modify: `src/types/messages.ts`
- Modify: `src/code/code.ts`
- Modify: `src/ui/App.tsx`
- Modify: `manifest.json`

## Implementation Steps

1. `manifest.json`: add `"enablePrivatePluginApi": true`.
2. `src/types/messages.ts`: add `FileContext` and the `FILE_CONTEXT` message arm.
3. `src/code/code.ts`: read `figma.fileKey` and `figma.root.name` defensively (guarded, since
   the property is absent for public plugins) and post `FILE_CONTEXT` once after `showUI`.
4. `src/utils/node-link.ts`: implement `toNodeIdParam` and `buildNodeUrl`.
5. `src/ui/components/NodeLink.tsx`: the compact bar; `null`-safe when no key.
6. `src/ui/App.tsx`: hold `fileContext`, render `NodeLink` directly under `Header`.
7. `tests/node-link.test.ts`: cover separators, missing key, name sanitisation, and that the
   node id survives round-tripping.

## Success Criteria

- [x] Bar renders under the header for a selected layer.
- [x] Clicking copies the URL and shows the toast.
- [x] Missing key degrades to the node ID with a reason.
- [x] Tests pass; typecheck clean; build succeeds.

## Risk Assessment

- *Risk:* `figma.fileKey` throws rather than returning `undefined` when the manifest flag is off.
  *Mitigation:* wrap the read in a guard and default to `undefined`.
- *Risk:* publishing publicly later silently breaks links.
  *Mitigation:* documented here and in the installation guide; the UI states the reason when
  the key is missing instead of rendering a dead URL.

## Known Limitations

- **Branch-file URLs are unverified.** `buildNodeUrl` emits exactly one URL shape
  (`/design/<key>/<slug>?node-id=<dashed>`) and has no way to express the `/branch/<key>/`
  form Figma uses for branch files. No Figma runtime and no branch file were available here,
  so the branch case could neither be confirmed nor fixed.
- **`figma.fileKey` acquisition has never run against real Figma.** The read was only ever
  exercised against a stubbed `figma` global in tests. Whether the property is populated, and
  whether the guard behaves as intended in a real sandbox, remains unconfirmed outside the stub.
- **The manifest `id` is a hand-invented string.** `manifest.json` sets `"id": "nodepeeker"`,
  which is not issued by Figma, so `figma.pluginId` is not a Figma-issued value and should not
  be relied on as one.
