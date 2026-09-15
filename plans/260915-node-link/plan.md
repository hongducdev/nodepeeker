---
title: "NodePeeker Node Link"
description: "Add a compact link bar under the header showing a deep link to the selected node for one-click copying, with a graceful fallback to the node ID when the file key is unavailable."
status: completed
priority: P1
tags: ["figma-plugin", "developer-tools", "ux"]
created: "2026-09-15"
---

# NodePeeker Node Link

## Overview

A deep link to the selected layer is the missing last step of the hand-off loop: the
inspector tells you what a layer *is*, but not how to *point someone at it*. This adds a
compact, always-visible link bar under the header.

## The constraint that shapes this feature

`figma.fileKey` is **not available by default**. Per the official typings:

> The file key of the current file this plugin is running on. **Only private plugins and
> Figma-owned resources have access to this.** To enable this behavior, you need to specify
> `enablePrivatePluginApi` in your `manifest.json`.

Consequences:

- `manifest.json` must set `"enablePrivatePluginApi": true` for the URL to resolve.
- **If the plugin is ever published publicly to the Figma Community, `fileKey` returns
  `undefined` permanently, regardless of the manifest**, and links stop working.
- Local/unsaved files also have no key.

So the feature degrades rather than breaks: without a key we show the node ID and say why.

## Phases

| Phase | Name | Status | Priority | Effort |
|---|---|---|---|---|
| 1 | [Node-Link](./phase-01-node-link.md) | Completed | P1 | 2h |

## Design Decisions

- **One-time context, not per-selection.** `fileKey` and the file name are constant for the
  session, so they travel once in a `FILE_CONTEXT` message rather than riding along on every
  `SELECTION_CHANGE`. The node ID is already in `NodeInspectionData.id`.
- **The link builder is a pure function** in `src/utils/`, so URL construction is unit-testable
  without a Figma runtime.
- **Compact bar, not a full panel.** The 340px sidebar is already dense; a full section would
  push the code viewer below the fold for a one-line affordance.
- **Degrade, never lie.** If no key is available the UI shows the node ID with an explicit
  reason instead of a URL that would 404.

## Constraints

- Fully offline; `networkAccess.allowedDomains` stays `["none"]`. The plugin only *displays* a
  URL; it never fetches it.
- No new runtime dependency.

## Success Criteria

- [x] Selecting a layer shows a copyable deep link to that layer.
- [x] Clicking the bar copies the full URL and shows the toast.
- [x] Without a file key, the node ID is shown with a short explanation.
- [x] The URL is built by a pure, tested function.
- [x] All tests pass; typecheck clean; build succeeds.
