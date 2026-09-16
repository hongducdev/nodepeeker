---
phase: 1
title: "SVG Preview"
status: completed
priority: P1
effort: "1.5h"
dependencies: []
---

# Phase 1: SVG Preview

## Overview

Add a rendered preview of the exported SVG markup to the SVG tab of `CodeViewer`, using the
string `App.tsx` already caches from the on-demand `REQUEST_EXPORT {format:'SVG', action:'view'}`
round-trip. No sandbox, IPC or type changes.

## Requirements

- **Functional:**
  - The SVG tab renders the layer's markup visually, above the highlighted code block.
  - The board is a fixed 160px, checkerboard-backed, `overflow-hidden` box; the artwork is
    centred and scaled down to fit inside it, never scaled up.
  - Empty markup renders no preview at all.
- **Non-functional:**
  - Zero new dependencies; offline-safe (no URL the iframe has to fetch).
  - Semantic Catppuccin tokens only; no `dark:` colour variants.
  - The preview must not render while another tab is active.

## Architecture

```
App.tsx  svgCache {nodeId, content}  ──►  CodeViewer(svg, isSvgLoading, …)
                                              │
                                       tab === 'svg' && svg
                                              ▼
                                         SvgPreview(markup)
                                              │
                                  dangerouslySetInnerHTML ──► board > svg
                                  (styles: .svg-preview-board in styles.css)
```

### Rendering contract

`SvgPreview` takes one prop, `markup: string`, and:

- returns `null` for an empty/blank string,
- otherwise injects the string verbatim into a board that carries the section label `Preview`.

The component holds no state, no effects and no fetch of its own — the fetch stays in
`App.tsx`, where the node-identity gate lives.

## Related Code Files

- Create: `src/ui/components/SvgPreview.tsx`
- Create: `tests/svg-preview.test.ts`
- Modify: `src/ui/components/CodeViewer.tsx`
- Modify: `src/ui/styles.css`
- Modify: `README.md`, `docs/installation-guide.md`, `AGENTS.md`

## Implementation Steps

1. `src/ui/styles.css`: add `.svg-preview-board` (checkerboard from `--ctp-surface1` /
   `--ctp-surface2`) and the `> svg` fit rules (`max-width:100%`, `max-height:100%`,
   `width:auto`, `height:auto`).
2. `src/ui/components/SvgPreview.tsx`: named export, `React.FC`, local `interface SvgPreviewProps`,
   muted `Preview` label row with an `Eye` icon matching the existing section-label style, and
   the board with `dangerouslySetInnerHTML`, annotated with why injection is the right call here.
3. `src/ui/components/CodeViewer.tsx`: render `{tab === 'svg' && svg ? <SvgPreview markup={svg} /> : null}`
   directly above the existing code box.
4. `tests/svg-preview.test.ts`: static-markup tests (see Acceptance).
5. Docs: README feature bullet, installation-guide code-viewer bullet, AGENTS.md component
   row and coverage table.

## Acceptance

- [x] `tests/svg-preview.test.ts`: real markup is injected as **elements** — the rendered
      string contains `<svg` / `<circle` and does **not** contain `&lt;svg` (a regression to
      escaped text is the failure mode that matters here).
- [x] Empty and blank markup render the empty string (no board, no label).
- [x] The section is labelled `Preview`.
- [x] `npm test`, `npm run typecheck`, `npm run build` clean.
- [x] Browser check on the real component: `npm run dev:ui`, inject a synthetic
      `SELECTION_CHANGE` + `EXPORT_RESULT {format:'SVG', action:'view'}` for that node id, press
      `3`, and confirm the rendering is scaled and centred on the checkerboard in both Latte and
      Mocha (Latte emulated via `prefers-color-scheme: light`) — the theme rendering has no
      automated coverage; the tab gate is covered by `tests/code-viewer.test.ts`.

## Success Criteria

- [x] SVG tab shows the preview above the code, for the current layer only.
- [x] No preview while loading or after a failed export.
- [x] Tests, typecheck and build pass; docs updated.

## Verification

- Static checks: `npx tsc --noEmit` clean; `npx vitest run` 18 files / 183 tests passing;
  `npm run build` succeeds (singlefile `dist/index.html`, 215.12 kB).
- Mutation checks (both reverted afterwards): deleting `dangerouslySetInnerHTML` fails
  `tests/svg-preview.test.ts`; replacing the `tab === 'svg'` gate with `svg ? …` fails the new
  `tests/code-viewer.test.ts` case `keeps the SVG preview off the non-SVG tabs` (baseline 5/5
  passing).
- Browser run against `npm run dev:ui` (340×640 panel, synthetic `SELECTION_CHANGE` +
  `EXPORT_RESULT {format:'SVG', action:'view'}` over the real message contract, tab opened with
  key `3`): board 316×160 with a 298×142 interior; a 24×24 export stays native and centred;
  1200×400 → 298×99.3; 400×1200 → 47.3×142; a `data:image/png` fill renders; white artwork is
  legible on the checkerboard in Latte (`prefers-color-scheme: light` emulated) and dark artwork
  in Mocha; empty markup, a failed export and a selection change to another node all render no
  board, and the other node's stale markup is dropped; markup with no width/height/viewBox
  leaves the panel layout intact at 640px.

## Risk Assessment

- *Risk:* `dangerouslySetInnerHTML` on a 1MB single-line `<path>` markup re-writes the DOM on
  every selection change.
  *Mitigation:* React only replaces `innerHTML` when the string changes, and the string is
  already in memory and already parsed by the code highlighter; measured during the browser
  check.
- *Risk:* a node whose SVG export fails leaves the tab with no preview forever (the request
  marker in `App.tsx` stays armed by design).
  *Mitigation:* the code box already states `<!-- No SVG available for this layer -->`; the
  preview staying absent is consistent with it.

## Known Limitations

- **No zoom or pan.** Large layers are shown scaled down to the 160px board; the preview is for
  confirmation of the artifact, not for inspecting detail.
- **The preview's positive path has no automated coverage.** This repo has no jsdom and no
  testing-library, so nothing asserts that the SVG tab actually renders the board, nor the
  light/dark theming; `tests/svg-preview.test.ts` renders the component from static markup only.
  Both were verified in a browser against the real message contract. The negative half of the gate
  is covered: the `tests/code-viewer.test.ts` case `keeps the SVG preview off the non-SVG tabs`
  asserts the injected `<circle` element and the `>Preview<` label are absent on the default CSS
  tab, and replacing the gate with `svg ? …` fails it.
