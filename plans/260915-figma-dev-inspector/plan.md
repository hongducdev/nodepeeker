---
title: "Figma Dev Inspector Plugin"
description: "High-performance Figma plugin replacing Dev Mode for free accounts: CSS & Tailwind code inspection, quick color copying (HEX/RGB/HSL), visual box model, and 1-click SVG/PNG export."
status: completed
priority: P2
branch: ""
tags: ["figma-plugin", "developer-tools", "tailwind", "css", "dev-mode-alternative"]
blockedBy: []
blocks: []
created: "2026-09-15T08:59:17.374Z"
createdBy: "ck:plan"
source: skill
---

# Figma Dev Inspector Plugin (Free Dev Mode Alternative)

## Overview
A lightweight, non-intrusive Figma plugin running as a floating compact sidebar (`editorType: ["figma"]`). It restores core developer hand-off functionality for free Figma accounts without a paid Dev Mode subscription:
- **Inspect Code Viewer:** Native CSS (`node.getCSSAsync()`) and automatic Tailwind CSS translation.
- **Quick Color Copier:** 1-click copy for HEX, RGBA, and HSL across selected node and direct children.
- **Visual Box Model:** Interactive display of Width, Height, Padding, Gap, and Corner Radii.
- **1-Click Asset Export:** Direct "Copy raw SVG code" and "Download SVG / PNG @2x" without opening Figma's export panel.

## Phases

| Phase | Name | Status | Priority | Effort |
|---|---|---|---|---|
| 1 | [Setup](./phase-01-setup.md) | Completed | P1 | 1h |
| 2 | [Core-Engine](./phase-02-core-engine.md) | Completed | P1 | 2h |
| 3 | [Tailwind-Transpiler](./phase-03-tailwind-transpiler.md) | Completed | P1 | 2h |
| 4 | [UI-Components](./phase-04-ui-components.md) | Completed | P1 | 3h |
| 5 | [Verification](./phase-05-verification.md) | Completed | P2 | 1h |

## Architecture & Data Flow

```
[ Figma Document (Canvas) ]
         │
         │ (selectionchange event)
         ▼
[ Plugin Sandbox: code.ts ]
 ├── Extracts raw properties: fills, strokes, padding, bounds, layout
 ├── Fetches CSS: await node.getCSSAsync()
 ├── Handles export: await node.exportAsync({ format })
 └── Emits message: figma.ui.postMessage({ type: 'SELECTION_DATA', data })
         │
         │ postMessage bridge
         ▼
[ UI Iframe: App.tsx (React 18 + Tailwind CSS + Lucide) ]
 ├── State Management: activeNode, activeTab (CSS / Tailwind), colorFormats
 ├── Components:
 │    ├── Header (Node name, type badge)
 │    ├── BoxModel (Interactive visual geometry diagram)
 │    ├── ColorPalette (HEX, RGB, HSL click-to-copy)
 │    ├── CodeViewer (Syntax-styled CSS & Tailwind with Copy All button)
 │    └── QuickExport (Copy SVG, Download SVG, Download PNG @2x)
 └── Toast System: Instant "Copied to clipboard!" notification
```

## Dependencies & Environment
- **Figma Desktop / Browser:** Runs locally via "Plugins > Development > Import plugin from manifest...".
- **Bundler:** Vite 5+ with `@vitejs/plugin-react` and `vite-plugin-singlefile`.
- **Typings:** `@figma/plugin-typings`.
