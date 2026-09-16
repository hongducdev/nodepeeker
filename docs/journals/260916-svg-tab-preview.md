# Journal: SVG Tab Preview in the Dev Inspector

**Date:** 2026-09-16  
**Topic:** Render the exported SVG markup as artwork above the SVG code tab, instead of showing it only as text  
**Author:** AI Agent (`ck:cook`)  

---

## 1. Context & Motivation

The SVG tab introduced in `260915-feat-svg-code-tab.md` shows the layer's exported markup as highlighted text and nothing else. The user asked, in Vietnamese, for a **preview** when that tab is selected — the text is the artifact to copy, but it is not the artifact to *look at*, and the only way to see the exported vectors was to copy them out and open them elsewhere.

The markup was already fetched on demand into `App.tsx` (`svgCache` holding `{ nodeId, content }`) and already reached `CodeViewer` as its `svg` prop, so this change needed **no sandbox work, no IPC change, and no message-contract change**: a UI rendering change over data already present in the panel.

---

## 2. Technical Decisions & Solutions

### A. A component, not another branch (`src/ui/components/SvgPreview.tsx`)

`SvgPreview: React.FC<{ markup: string }>` is a separate file rather than another conditional inside `CodeViewer`'s render. The contract is deliberately narrow — **markup in, markup out, nothing when there is no markup** — which is exactly what this repo's static-rendering test style can assert, without a DOM or an interaction harness. `CodeViewer` gains one gate at the top of the SVG tab's code box (`{tab === 'svg' && svg ? <SvgPreview markup={svg} /> : null}`) and keeps ownership of which tab is active.

### B. Injection over a data-URI `<img>`

The markup is injected with `dangerouslySetInnerHTML` rather than encoded into `src="data:image/svg+xml,…"` and handed to an `<img>`:

- Figma embeds raster fills as `<image href="data:…">` inside the exported `<svg>`. An `<img>`-sandboxed SVG may refuse to load that nested resource, so the picture would silently lose its bitmaps.
- The preview must show **exactly what Copy and Download ship**. Re-encoding into a data URI is a second serialisation step that can differ from the bytes the other two paths hand out.

The string is trusted by construction and deliberately **not** sanitised. `<script>` delivered through `innerHTML` is inert, but event-handler attributes *do* run (see §3.3), and the string can only originate from `exportAsync({ format: 'SVG' })` in `src/code.ts` over the sandbox bridge — the same trust boundary the existing Copy and Download paths already cross. A sanitizer would rewrite the very artifact being previewed, so it would show something other than what ships.

### C. Nothing to preview → no preview

`SvgPreview` returns `null` for empty or whitespace-only markup. The loading and failure states stay where they already are, in the code box (`Loading SVG…`, `<!-- No SVG available for this layer -->`), and the board cannot flash an empty frame mid-export while the `EXPORT_RESULT` for the SVG format is still in flight.

### D. The checkerboard board (`src/ui/styles.css`)

Exported artwork is usually transparent, and it is frequently pure white or near-black — invisible against Latte's near-white `base` and against Mocha's `crust` respectively. The board is therefore a **mid-grey two-tone checkerboard** built from `--ctp-surface1` and `--ctp-surface2` (45° gradients, `background-size: 12px 12px`), so white artwork is legible in the light theme and dark artwork in the dark one without the preview inventing a background the export does not have.

`.svg-preview-board > svg` fits the artwork inside the board: `width/height: auto` with `max-width/max-height: 100%` scales a large export *down* along its own aspect ratio and never scales a small one *up* — a 24 × 24 icon stays native and centred.

### E. A fixed 160px board

The board is `h-40` (160px), so the panel does not jump when clicking through layers of very different sizes. The preview is a confirmation, not an inspection surface (see §5).

No new state, no new controls: **Copy, Download and the keyboard shortcuts are unchanged**, and the default tab remains CSS.

---

## 3. Defects Found in Review and Fixed

1. **The SVG-tab gate had no assertion, and the assertion that looked like it covered the negative direction could not see it** (`tests/code-viewer.test.ts`). The file's `textOf` helper strips tags before comparing, so injected artwork vanished from its view — a test written that way would have passed whether or not the gate existed. The new case `keeps the SVG preview off the non-SVG tabs` asserts on the **raw markup** instead: the injected `<circle cx="2"` element and the `>Preview<` label must be absent on the default CSS tab. Mutation-verified — replacing the gate with `svg ? …` fails it (baseline 5/5 pass).
2. **The first version of that assertion was itself wrong.** It used `viewBox` as the needle, which the tab bar's own lucide `Code2` icon already emits as an attribute — so it failed for the wrong reason and would have been a false positive in the mutation check. It was re-asserted on a string that only injected artwork can produce.
3. **The `dangerouslySetInnerHTML` rationale overstated its safety.** The comment claimed Figma's exporter emits no event-handler attributes; an independent verifier reproduced that handler attributes **do** execute on injection (`onerror` fired). The comment was rewritten to state the actual trust boundary — the plugin's own Figma export, an offline iframe (`networkAccess.allowedDomains: ["none"]`), the same boundary as the existing Copy and Download paths — rather than resting on an unverifiable premise about the exporter's output.

---

## 4. Verification

- **Tests:** `npx vitest run` — 18 files, 183 tests, all passing. New `tests/svg-preview.test.ts` (3 static-render tests: verbatim element injection with no escaped `&lt;`, the `Preview` label, and `''` for empty and whitespace-only markup), plus the new non-SVG-tab case in `tests/code-viewer.test.ts`.
- **Mutation-tested:** removing `dangerouslySetInnerHTML` fails `svg-preview.test.ts`; replacing the tab gate with `svg ? …` fails the new `code-viewer.test.ts` case. The tests bind to behaviour, not to the plumbing.
- **TypeScript:** `npx tsc --noEmit` — clean. **Build:** `npm run build` succeeds (singlefile `dist/index.html`, 215.12 kB).
- **Live browser (`npm run dev:ui`):** the real message contract was driven end to end — synthetic `SELECTION_CHANGE`, then `EXPORT_RESULT { format: 'SVG', action: 'view' }`, then the tab switched with key `3`. Measured a **316 × 160 board with a 298 × 142 interior**; a 24 × 24 export stays native and centred; 1200 × 400 → 298 × 99.3; 400 × 1200 → 47.3 × 142; a `data:image/png` fill renders; white artwork is legible on the checkerboard in Latte (emulated `prefers-color-scheme: light`) and dark artwork in Mocha.
- **Live negatives:** empty markup, a failed export, and a selection change to another node each render **no board**, and the other node's stale markup is dropped. An export with no `width`/`height`/`viewBox` leaves the panel layout intact at 640px.
- **Independent verification agent:** PASS with four informational notes. **Independent reviewer:** verdict `ship`, one P3 — the tab gate had no assertion (§3.1), now fixed and mutation-verified; the reviewer separately confirmed the stale-markup gate cannot leak (`App.tsx` compares `svgCache.nodeId === selectedNodeId`, resets the request marker, and drops `EXPORT_RESULT` payloads for other node ids).
- **Docs:** `README.md` (SVG Markup bullet), `docs/installation-guide.md` (Inspect Code Viewer bullet), and `AGENTS.md` (`src/ui/components/CodeViewer.tsx` row plus a `tests/svg-preview.test.ts` row in the Current coverage table).

---

## 5. Known Limitations

- **No zoom or pan.** A large layer renders as a scaled-down confirmation inside a fixed 160px board, not as an inspection surface; pixel-level checks still require opening the copied markup elsewhere.
- **The preview's positive path has no automated coverage.** The repo has no jsdom and no testing-library, so the tests are static renders and the rendering itself is proven only by the browser run above.
- **The `markup` prop is typed non-optional and relies on `CodeViewer`'s `&& svg` gate.** Passing `undefined` would need a cast; the gate is the contract.
- **Whitespace-only markup renders nothing, while a zero-width-space-only string would render an empty board.** Unreachable from Figma's exporter, which always emits a root `<svg>`.
