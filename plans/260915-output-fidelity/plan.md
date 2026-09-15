---
title: "NodePeeker Output Fidelity"
description: "Fix architectural debt (eager SVG export, misplaced opacity, dead payload fields) and make Tailwind/CSS output faithful to Figma -- real shadows, text line-height/letter-spacing, Hug/Fill sizing, node opacity, and absolute positioning."
status: completed
priority: P1
tags: ["figma-plugin", "correctness", "tailwind", "architecture"]
created: "2026-09-15"
---

# NodePeeker Output Fidelity

## Overview

An audit of the shipped plugin found six defects where the generated output is either
**wrong** or **silently incomplete**. For a Dev Mode replacement this is worse than a
missing feature: developers trust the output and paste it.

| # | Defect | Evidence |
|---|---|---|
| 1 | `exportAsync({format:'SVG'})` runs on **every** `selectionchange`, even when the SVG tab is never opened | `src/code/extractors.ts` (`extractNodeData`) |
| 2 | `opacity` is only captured **inside** the `if (dropShadow)` branch, so a translucent node without a shadow loses its opacity | `src/code/extractors.ts:136-146` |
| 3 | `shadowType` is **hardcoded `'md'`** regardless of the real shadow | `src/code/extractors.ts:142` |
| 4 | `lineHeight` and `letterSpacing` are extracted but the transpiler never reads them (dead payload) | `TypographyData` vs `src/utils/tailwind-transpiler.ts` |
| 5 | Hug/Fill sizing modes are not mapped; `layoutAlign` is extracted but unused | transplier sizing bucket |
| 6 | Absolute positioning is not surfaced | not extracted |

## Phases

| Phase | Name | Status | Priority | Effort |
|---|---|---|---|---|
| 1 | [Architectural-Debt](./phase-01-architectural-debt.md) | Completed | P1 | 2h |
| 2 | [Output-Fidelity](./phase-02-output-fidelity.md) | Completed | P1 | 3h |

## Design Decisions

- **Shadows use arbitrary Tailwind syntax, not named presets.** `shadow-md` is a guess;
  `shadow-[0_4px_8px_rgba(0_0_0_/_0.1)]` is the truth. The codebase already falls back to
  arbitrary bracket values everywhere else (`w-[123.45px]`, `rounded-[5px]`), so this is
  the consistent choice.
- **`effects` is removed, not extended.** Replaced by `shadows: ShadowData[]`. A boolean
  `hasDropShadow` plus a fabricated `shadowType` cannot describe a multi-layer shadow.
- **`opacity` moves to the top level** of `NodeInspectionData`, decoupled from shadows.
- **SVG becomes lazy**: requested on demand and cached per node id.

## Constraints

- Fully offline; `networkAccess.allowedDomains` stays `["none"]`. No new runtime dependency.
- Both bundles keep targeting `es2020`.
- Contract changes land in `src/types/messages.ts` first (single source of truth for both threads).

## Success Criteria

- [x] Selecting a node no longer performs a vector export.
- [x] A translucent node without a shadow reports its opacity.
- [x] A node with a real drop shadow produces its actual offset/blur/spread/colour.
- [x] Text nodes produce `leading-*` and `tracking-*`.
- [x] Hug/Fill frames and stretched children produce `w-fit`/`h-fit`/`self-stretch`.
- [x] Absolutely-positioned children produce `absolute` with offsets.
- [x] All tests pass; typecheck clean; build succeeds.
