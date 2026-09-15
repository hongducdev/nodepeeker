---
title: "NodePeeker Distance Measurement"
description: "Measure the gap between exactly two selected layers, the way Dev Mode's ruler does, rendered in the panel because a plugin cannot draw an overlay on the canvas."
status: in-progress
priority: P1
tags: ["figma-plugin", "developer-tools", "measurement"]
created: "2026-09-15"
---

# NodePeeker Distance Measurement

## Overview

Select two layers and see how far apart they are: horizontal and vertical gaps, edge-to-edge
distances, alignment, and overlap. This is the hand-off question the inspector could not
answer — it describes one layer in isolation, never the relationship between two.

## The constraint that shapes this feature

**Dev Mode's ruler cannot be reproduced.** A plugin's UI lives in an iframe; Figma exposes no
API for drawing an ephemeral overlay on the canvas. There is no `measure`-style surface in the
plugin typings.

Two ways to live with that:

1. **Render the measurement in the panel** — with a mini diagram showing the two boxes and the
   gap. Non-invasive: the file is not touched and no undo entry is created.
2. **Create real nodes on the canvas** — lines and labels positioned between the layers. This
   is what some measure plugins do, but the artefacts are real document nodes: they appear in
   the layers panel, enter undo history, and must be cleaned up. This plugin has been strictly
   read-only, so adding document mutation for a *reading* feature is a bad trade.

Chosen: **option 1.** The panel already renders diagrams (`BoxModel`), so a two-box distance
diagram is consistent with the existing visual language.

## Design Decisions

- **Exactly two nodes.** That is the Dev Mode case. 0, 1, and 3+ keep their current behaviour.
- **Absolute bounds.** `absoluteBoundingBox` is in canvas coordinates, so the measurement works
  between layers in different frames, not just siblings.
- **Pure math in `src/utils/`.** The geometry is a pure function of four numbers, so it is
  fully unit-testable without a Figma runtime.
- **`SelectionState` becomes a discriminated union** (`single` / `pair` / `none`) rather than
  carrying an optional pair field, because the three cases render different things.

## Phases

| Phase | Name | Status | Priority | Effort |
|---|---|---|---|---|
| 1 | [Distance](./phase-01-distance.md) | Pending | P1 | 3h |

## Constraints

- Offline only; no new runtime dependency.
- The plugin stays read-only — no canvas mutation.

## Success Criteria

- [ ] Exactly two selected layers produce a measurement.
- [ ] Horizontal and vertical gaps are reported, with 0 meaning overlap on that axis.
- [ ] Edge-to-edge distances and edge alignment are reported.
- [ ] A mini diagram shows the two boxes and the gap.
- [ ] Single, empty and 3+ selections keep their existing behaviour.
- [ ] A selection whose bounds are unavailable degrades rather than throwing.
- [ ] All tests pass; typecheck clean; build succeeds.
