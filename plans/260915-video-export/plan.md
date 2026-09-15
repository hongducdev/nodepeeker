---
title: "NodePeeker Video & GIF Export"
description: "Export the selected layer's animation as MP4 or GIF using Figma's native video export, with fps/quality controls and automatic resolution of the enclosing top-level frame."
status: completed
priority: P1
tags: ["figma-plugin", "export", "video", "gif"]
created: "2026-09-15"
---

# NodePeeker Video & GIF Export

## Overview

Add MP4 and GIF export so a motion design can be handed off alongside the static specs.
Figma encodes both natively — no bundling an encoder.

## The constraint that shapes this feature

From the official typings (`plugin-api.d.ts`, on `exportAsync`):

> Passing an `ExportSettingsMP4`, `ExportSettingsGIF`, or `ExportSettingsWEBM` exports a video
> (returned as a `Uint8Array`). **The exported node must be a top-level frame (a frame placed
> directly on a page) whose content is animated**; the entire frame is encoded across the
> animation's duration. Calling video export on any other node — including a nested animated
> frame, or an individual layer that has keyframes but is not itself a top-level frame —
> **rejects with an error**. To export the animation a layer participates in, first resolve its
> enclosing top-level frame with `getTopLevelFrame()`. Video export is only available when
> running in Figma.

Consequences:

- **`getTopLevelFrame()` is mandatory**, not a nicety. Exporting `selection[0]` directly fails
  for any nested layer, which is the common case.
- **Animation presence is not detectable up front.** There is no API to ask "is this frame
  animated?", so a frame that is structurally eligible may still reject at export time. The UI
  must surface that clearly rather than pre-filtering perfectly.
- Naming the frame that will actually be encoded is required, because it may differ from the
  selection.

## Design Decisions

- **Eligibility is structural, and shown.** Video buttons render only when `getTopLevelFrame()`
  returns a frame; the section names that frame so the user knows what will be encoded. No dead
  buttons for non-frame selections.
- **`Uint8Array` replaces `number[]` for binary payloads.** `figma.ui.postMessage` supports
  `Uint8Array` via structured clone. The existing PNG path uses `Array.from(bytes)`, which turns
  a 10 MB video into ten million JS numbers. Video makes this untenable, so PNG moves too.
- **fps and quality are user-controlled**, with per-format defaults and allowed values
  (`MP4` 12/24/30/60, `GIF` 8/12/15/24/30) because the valid sets genuinely differ.
- **A separate `VideoExport` component**, not an extension of `QuickExport`: video carries
  settings and a frame label that would bloat the static-export grid.

## Phases

| Phase | Name | Status | Priority | Effort |
|---|---|---|---|---|
| 1 | [Video-Export](./phase-01-video-export.md) | Completed | P1 | 3h |

## Constraints

- Offline only; `networkAccess.allowedDomains` stays `["none"]`.
- No new runtime dependency — Figma encodes.
- Bundles keep targeting `es2020`.

## Success Criteria

- [x] The section appears only when the selection resolves to a top-level frame.
- [x] It names the frame that will be encoded.
- [x] MP4 and GIF each export with user-selected fps and quality.
- [x] Binary payloads cross the boundary as `Uint8Array`, not `number[]`.
- [x] A frame with no animation reports a clear failure rather than a silent no-op.
- [x] All tests pass; typecheck clean; build succeeds.
