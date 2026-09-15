---
phase: 1
title: "Video-Export"
status: completed
priority: P1
effort: "3h"
dependencies: []
---

# Phase 1: Video & GIF Export

## Overview

Export the selected layer's animation as MP4 or GIF, resolving the enclosing top-level frame
first because Figma rejects video export on anything else.

## Requirements

- **Functional:**
  - `getTopLevelFrame()` is resolved in the sandbox and reported with the node data, so the UI
    can name the frame that will actually be encoded.
  - The video section renders only when such a frame exists.
  - MP4 and GIF export with user-selected fps and quality; the allowed fps sets differ per
    format and the sandbox clamps to them defensively.
  - Failures ("no animation to encode") surface as a clear message.
- **Non-functional:**
  - Binary payloads cross the boundary as `Uint8Array`, not `number[]`.

## Architecture

```
selection ──► extractNodeData
                └─ topLevelFrame = node.getTopLevelFrame()  ──► {id, name} on NodeInspectionData

UI: VideoExport (renders only if topLevelFrame)
      ──► REQUEST_VIDEO_EXPORT {format, fps, quality, loopCount, scale}
              │
sandbox ──────┘
  frame = selection[0].getTopLevelFrame()   (re-resolved; never trust the client)
  frame.exportAsync({format, fps, quality, constraint})
      ──► VIDEO_EXPORT_RESULT {format, bytes: Uint8Array, name}
                │
UI ─────────────┘  Blob → download
```

## Related Code Files

- Create: `src/utils/video-options.ts` (pure: allowed fps per format, defaults, scale set)
- Create: `src/ui/components/VideoExport.tsx`
- Create: `tests/video-options.test.ts`
- Modify: `src/types/messages.ts`
- Modify: `src/code/extractors.ts`
- Modify: `src/code/code.ts`
- Modify: `src/ui/App.tsx`

## Implementation Steps

1. `src/types/messages.ts`: add `VideoFormat`, `VideoQuality`, `VideoExportOptions`,
   `topLevelFrame` on `NodeInspectionData`, `VIDEO_EXPORT_RESULT`, `REQUEST_VIDEO_EXPORT`; change
   the PNG payload from `number[]` to `Uint8Array`.
2. `src/utils/video-options.ts`: `FPS_BY_FORMAT`, `DEFAULT_FPS`, `SCALE_VALUES`, and a
   `clampFps(format, fps)` guard.
3. `src/code/extractors.ts`: set `topLevelFrame` from `node.getTopLevelFrame()`.
4. `src/code/code.ts`: handle `REQUEST_VIDEO_EXPORT` — re-resolve the frame from the live
   selection, build per-format settings, export, post the bytes. Send PNG bytes as a
   `Uint8Array`.
5. `src/ui/components/VideoExport.tsx`: format toggle, fps/quality selects, frame label,
   in-flight state.
6. `src/ui/App.tsx`: hold the video payload, download it, render `VideoExport`, and rebuild the
   PNG Blob from a `Uint8Array`.

## Success Criteria

- [x] Video section hidden when the selection has no enclosing top-level frame.
- [x] The frame to be encoded is named in the UI.
- [x] MP4 and GIF export with the chosen fps and quality.
- [x] PNG and video bytes cross as `Uint8Array`.
- [x] A non-animated frame reports a clear failure.
- [x] Tests pass; typecheck clean; build succeeds.

## Risk Assessment

- *Risk:* the frame is structurally eligible but has no animation, so the export rejects.
  *Mitigation:* catch in the sandbox and surface a specific message; do not pre-filter.
- *Risk:* `Uint8Array` does not survive the message boundary as expected.
  *Mitigation:* verify in a browser that the received value is a `Uint8Array` and that the Blob
  downloads; fall back to base64 only if it does not.
- *Risk:* long animations produce large payloads.
  *Mitigation:* default to scale 1 and expose the scale set so the user can trade size.

## Known Limitations

Verified as far as the plugin's own code and a browser run of the UI allow; the following are
not settled and would need real Figma (or a real structured-clone boundary) to close.

- **`getTopLevelFrame()` self-return for a directly-selected frame is undocumented and
  unverified against real Figma.** The API doc states only that it returns "the top-most frame
  that contains this node ... undefined if the node is not inside a frame", which does not
  promise a frame returns itself. `resolveVideoFrame()` handles both readings — it short-circuits
  `FRAME` + `PAGE` parent before ever calling the API, and falls back to the API result otherwise —
  but only Figma can confirm which reading is real.
- **A frame inside a Section is rejected by the resolver on the strength of the "placed directly
  on a page" wording, which is likewise unverified.** `resolveVideoFrame()` requires
  `frame.parent?.type === 'PAGE'`, so a top-level frame nested in a Section resolves to
  `undefined` and the UI section never renders. If Figma in fact accepts a Section child, this is
  an over-rejection.
- **`clampFps` tie-breaks are unspecified and deliberately unpinned.** For a rate equidistant from
  two accepted values (e.g. `30` against MP4's `[12, 24, 30, 60]` is safe, but a value exactly
  between two entries) the reduce keeps whichever candidate the list order reaches first. The
  behaviour is deterministic but is an artifact of list order, not a documented rule; no test pins
  it.
- **The `Uint8Array` boundary is asserted against a mock that stores the object by reference, so
  real structured-clone fidelity is unproven.** The tests confirm the sandbox posts `Uint8Array`
  and that the UI rejects anything else via `instanceof`, but a mock cannot demonstrate that
  `figma.ui.postMessage` clones a multi-MB `Uint8Array` across the real boundary as a live
  `Uint8Array` rather than degrading it.
