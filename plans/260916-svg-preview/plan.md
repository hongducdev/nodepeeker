---
title: "SVG Tab Preview"
description: "Render the already-fetched SVG markup as a visual preview inside the SVG tab, above the code block, using the same on-demand markup the Copy/Download actions ship."
status: completed
priority: P1
tags: ["figma-plugin", "developer-tools", "ux"]
created: "2026-09-16"
---

# SVG Tab Preview

## Overview

The SVG tab shows the exported markup as text and nothing else. The markup is already
fetched on demand for that tab (`REQUEST_EXPORT {format:'SVG', action:'view'}` →
`EXPORT_RESULT` → `App.tsx` caches `{nodeId, content}`), so rendering it costs no sandbox
work, no IPC change and no message-contract change — the preview is a pure UI function of a
string that is already in the iframe.

## The constraint that shapes this feature

- **The plugin is strictly offline** (`networkAccess.allowedDomains: ["none"]`). The preview
  must render from the markup string alone — no `<img src>` to a remote URL, no CDN, no
  font or script fetch. Figma's SVG export is self-contained, so this holds.
- **The markup is not third-party content.** It is produced by Figma's own exporter inside
  the sandbox from the user's selection and crosses `postMessage` as a string. The UI never
  receives markup authored elsewhere.
- **The markup is fetched lazily and belongs to exactly one node.** `App.tsx` drops any
  `EXPORT_RESULT` whose `nodeId` is not the current selection, so the preview inherits the
  same guarantee: it can never paint a layer the user has navigated away from.

## Phases

| Phase | Name | Status | Priority | Effort |
|---|---|---|---|---|
| 1 | [SVG Preview](./phase-01-svg-preview.md) | Completed | P1 | 1.5h |

## Design Decisions

- **Inline injection, not a data-URI `<img>`.** The markup is rendered into a scoped
  container with `dangerouslySetInnerHTML`, which reproduces exactly what the user will copy
  or download — including `<image href="data:…">` fills, which a sandboxed `<img>`-embedded
  SVG may refuse to load. `<script>` inserted through `innerHTML` does not execute, Figma's
  exporter emits no script or event-handler attributes, and the sandbox has no privileges to
  leak into the UI realm. No sanitizer is added: it would be untested surface that could
  silently alter the artifact being previewed.
- **Its own component** (`SvgPreview`) rather than another branch inside `CodeViewer`, so the
  rendering contract (markup in, markup out; nothing when there is no markup) is unit-testable
  against static markup rendering, which is the only component-test style this repo has.
- **Nothing to preview → no preview.** The component returns `null` when the markup is empty.
  Loading and failure states stay where they already are (the code box renders
  `Loading SVG…` / `<!-- No SVG available for this layer -->`), so the preview never needs a
  second, weaker copy of them and cannot flash an empty frame while the export is in flight.
- **A checkerboard board, not `bg-crust`.** Figma artwork is frequently transparent and can be
  pure white (invisible on Latte's near-white `base`) or near-black (invisible on Mocha's
  `crust`). A low-contrast `surface1`/`surface2` checkerboard, built from the same palette
  custom properties as every other colour, is mid-grey in both modes and signals transparency.
- **Fixed 160px board height**, artwork centred and scaled down to fit (`max-width`/`max-height`
  on the injected root `<svg>`, never scaled up). A fixed box keeps the panel stable when the
  user clicks through layers of very different sizes.
- **No new controls.** Copy, download and the keyboard shortcuts are unchanged; the preview is
  read-only. It is not clickable and holds no state.

## Constraints

- No new runtime dependency; no new message type; no sandbox change.
- Semantic Catppuccin tokens only — the checkerboard is declared in `src/ui/styles.css` next to
  the existing custom-scrollbar rules, from `--ctp-surface1` / `--ctp-surface2`.
- The preview renders only while the SVG tab is active; the other two tabs are untouched.

## Success Criteria

- [x] Switching to the SVG tab shows a scaled, centred rendering of the layer's exported markup.
- [x] White and dark artwork are both legible, and transparency is visible, in both themes.
- [x] A layer whose SVG export is still loading, or failed, shows no preview at all.
- [x] No markup from a previously selected layer can appear (cached `{nodeId, content}` gate).
- [x] `npm test`, `npm run typecheck`, `npm run build` all clean.

## Related Files

- Create: `src/ui/components/SvgPreview.tsx`
- Create: `tests/svg-preview.test.ts`
- Modify: `src/ui/components/CodeViewer.tsx`
- Modify: `src/ui/styles.css`
- Modify: `README.md`, `docs/installation-guide.md`, `AGENTS.md`

## Risk Assessment

- *Risk:* Figma's export carries no explicit way to tell "large node" from "large detail"; a
  4000px frame shrinks to a thumbnail the user cannot inspect.
  *Mitigation:* accepted — the tooltip-free preview is for confirmation, not measurement; the
  code block and the download remain exact. Not solved by a zoom control in this phase (see
  Known Limitations).
- *Risk:* injected markup could disturb the plugin's own layout (e.g. an `<svg>` with no
  `viewBox` sizing itself to 100%).
  *Mitigation:* the board is a fixed-height, `overflow-hidden` flex container and the child
  `<svg>` is capped by a descendant selector in `styles.css`.
