# Repository Guidelines

## Project Overview

**NodePeeker** is a Figma plugin that restores core developer hand-off features for free Figma accounts (replacing paid Dev Mode). It opens as a 340×580 floating iframe on the canvas and provides five features:

1. **Code inspection** — Pure CSS (default tab) and auto-translated Tailwind CSS, with syntax highlighting.
2. **Color copier** — HEX / RGB / HSL for fills and strokes, 1-click copy.
3. **Visual box model** — bounds, padding, gap, corner radius, and border style.
4. **1-click export** — copy raw SVG, download SVG, download PNG @2x.
5. **Animation export** — MP4 / GIF of the selected layer's **top-level frame** (Figma encodes the whole frame, not the selected layer), with per-format fps, MP4 quality or GIF loop count, and a scale.

The plugin is **strictly offline**: `manifest.json` declares `networkAccess.allowedDomains: ["none"]`. No CDN, no web fonts, no telemetry. Every asset (including Lucide icons) is bundled inline.

---

## Architecture & Data Flow

The plugin is **not a single program**. Figma runs two isolated JavaScript realms that cannot share modules, memory, or globals. The only bridge is `postMessage`.

| Realm | Entry | Bundler | Output | Capabilities |
|---|---|---|---|---|
| **Sandbox** | `src/code/code.ts` | esbuild | `dist/code.js` | Figma Plugin API (`figma.*`, scene graph). **No DOM**: no `document`, `window`, `URL`, `Blob`, `navigator`. |
| **UI iframe** | `src/ui/App.tsx` | Vite + `vite-plugin-singlefile` | `dist/index.html` | React 18, DOM, clipboard, downloads. **No `figma.*`** — only `parent.postMessage`. |

`src/types/messages.ts` is the **only module imported by both threads**. It is the wire contract; the two realms compile it independently.

### End-to-end data flow

```
selectionchange ─► handleSelectionChange()          src/code/code.ts
                     ├─ seq guard (++selectionSequence)
                     ├─ 0 selected  ─► SELECTION_CHANGE {selected:false,count:0}
                     ├─ >1 selected ─► SELECTION_CHANGE {selected:false,count:n}
                     └─ await extractNodeData(node)  src/code/extractors.ts
                          ├─ getCSSAsync()          (try/catch, fallback {width,height})
                          ├─ layout / padding / radius probes
                          ├─ typography (TEXT nodes)
                          ├─ extractColorsFromNode  src/code/color-utils.ts
                          ├─ effects → shadows + opacity
                          ├─ sizing (Hug axes) / absolute position
                          └─ border from strokes + dashPattern
                          ✗ no exportAsync — SVG is not extracted here
                   ─► postMessage SELECTION_CHANGE {selected:true,data}
                          │
                          ▼
                   setSelection(payload)             src/ui/App.tsx
                          │
        ┌─────────────────┼──────────────────┬───────────────┐
     Header           BoxModel          ColorPalette     CodeViewer
   (+ BorderStyle)                                     transpileToTailwind(data)
                                                        src/utils/tailwind-transpiler.ts
```

**Export flow (reverse direction):** `QuickExport` → `parent.postMessage({pluginMessage:{type:'REQUEST_EXPORT',...}})` → `code.ts` **re-reads `figma.currentPage.selection`** (it does not cache the node) → `exportAsync` → `EXPORT_RESULT`.

**Video export flow (its own message pair).** `VideoExport` (`src/ui/components/VideoExport.tsx`) → `REQUEST_VIDEO_EXPORT {options}` → `code.ts` **re-resolves the frame from the live selection** with `resolveVideoFrame` (`src/code/video-frame.ts`), never trusting a node id sent back by the UI → `frame.exportAsync({format:'MP4'|'GIF', fps, constraint, …})` with `quality` for MP4 or `loopCount` for GIF → `VIDEO_EXPORT_RESULT {format, bytes: Uint8Array, name}`. The node Figma actually encodes is the frame the selection lives in, so it is **often not the selected layer** — a keyframe-bearing layer inside a frame exports that whole frame, not the layer. `SELECTION_CHANGE` therefore carries `topLevelFrame {id,name}`, and the UI labels the frame that will be encoded rather than the selection.

**Link flow (one-shot, at startup).** `App.tsx` posts `INIT_REQUEST` on mount; `code.ts` answers with `FILE_CONTEXT {fileKey?, fileName}` and only then runs the first `handleSelectionChange()`. File identity is constant for the session, so this message is sent **once** and never rides along on `SELECTION_CHANGE`. `NodeLink` (`src/ui/components/NodeLink.tsx`) consumes it through `buildNodeUrl` (`src/utils/node-link.ts`) to render a copyable deep link. When no file key is available the builder returns `null` and the bar falls back to `toNodeIdParam(nodeId)` — the node id in **URL form** (`3844-702`). That is **not** the API form (`3844:702`) Figma's Plugin API expects, so the copy label and the note name the URL form explicitly rather than calling the value "the node ID".

**SVG is fetched on demand, not with the selection.** `SELECTION_CHANGE` no longer carries `svg`; the payload stops at `NodeInspectionData`. Opening the SVG tab sends `REQUEST_EXPORT {format:'SVG', action:'view'}`, which is answered by `EXPORT_RESULT` carrying the markup **and the `nodeId` it belongs to**. `App.tsx` caches exactly one node's markup (`{nodeId, content}`) and **drops any response whose `nodeId` is not the current selection**, so navigating away mid-export cannot paint another layer's markup. A request marker (`svgRequestedForRef`) makes the fetch once per node and stays armed after `EXPORT_ERROR`, so a failed export is not retried in a loop.

### Key architectural rules

- **Race guard is mandatory.** `code.ts` keeps a module-level `let selectionSequence = 0`. Each handler run captures `const seq = ++selectionSequence` *before* awaiting and re-checks `if (seq !== selectionSequence) return;` *after every await*. Without this, a slow `getCSSAsync()` from an earlier selection overwrites a newer one.
- **Derive, don't store.** Tailwind classes are computed during render (`CodeViewer` calls `transpileToTailwind(data)`), never held in state.
- **Extraction is async only because Figma is.** `getCSSAsync()` is the only promise in `extractors.ts`; everything else there is synchronous. Vector export no longer happens during extraction — it lives behind `REQUEST_EXPORT` in `code.ts`.
- **Binary crosses `postMessage` as `Uint8Array`, via structured clone.** `figma.ui.postMessage` clones rather than serializing to JSON, so PNG and video payloads are posted as real `Uint8Array` objects and used directly. **Never `Array.from(bytes)`** — that expands a multi-MB encode into millions of JS numbers (an 8 MB video becomes an 8-million-element array). SVG is still decoded to a `string` first via `uint8ArrayToString`, because the code viewer renders it as text.

---

## Key Directories

| Path | Purpose |
|---|---|
| `src/code/` | **Sandbox thread.** Scene-graph reading, color math, message routing. Must stay DOM-free. |
| `src/ui/` | **UI thread.** React root (`App.tsx`, `main.tsx`), `components/`, `hooks/`, Tailwind entry `styles.css`, Vite entry `index.html`. |
| `src/utils/` | **Shared pure logic**, runs in the iframe. Tailwind scale tables and the transpiler. No Figma and no DOM dependency. |
| `src/types/` | `messages.ts` — the wire contract imported by both threads. |
| `tests/` | Vitest unit tests — `src/code/`, `src/utils/`, and statically rendered UI components. |
| `dist/` | Build output. **Gitignored** — never edit by hand. |
| `docs/` | `installation-guide.md` (user-facing), `brainstorm-summary-*.md` (decision record), `journals/` (per-session engineering log). |
| `plans/` | `plan.md` + `phase-0N-*.md` execution plans with frontmatter and checklists. |

---

## Development Commands

```bash
npm install            # first time only

npm run build          # FULL BUILD — required before loading into Figma
npm run build:code     # esbuild  → dist/code.js   (sandbox)
npm run build:ui       # vite     → dist/index.html (single-file UI)
npm run watch:code     # esbuild --watch for sandbox iteration
npm run dev:ui         # Vite dev server, root = src/ui
npm test               # vitest run (single pass, never watch)
npm run typecheck      # tsc --noEmit
```

`npm run build` runs `build:code` **then** `build:ui`, and the order is load-bearing: `vite.config.ts` sets `emptyOutDir: false` so the UI build does not wipe `dist/code.js`.

### Loading in Figma

Figma Desktop → **Plugins → Development → Import plugin from manifest…** → select root `manifest.json`. After rebuilding, focus the plugin window and press `Ctrl+R` / `Cmd+R`, or right-click → **Reload plugin**.

---

## Code Conventions & Common Patterns

### Naming
- Component files `PascalCase.tsx`, one component each, **named export only** — `export const Header: React.FC<HeaderProps> = (...)`, with a local `interface HeaderProps`. No default exports.
- Utility modules are kebab-case (`tailwind-transpiler.ts`, `tailwind-scale.ts`) or `*-utils.ts` (`color-utils.ts`).
- Hooks are `useX.ts` exporting `useX()`.
- Functions are camelCase verbs: `extractNodeData`, `transpileToTailwind`, `toTailwindDimension`, `uint8ArrayToString`, `downloadBlob`.
- Message `type` discriminants are SCREAMING_SNAKE: `SELECTION_CHANGE`, `REQUEST_EXPORT`, `REQUEST_VIDEO_EXPORT`, `INIT_REQUEST`, `EXPORT_RESULT`, `VIDEO_EXPORT_RESULT`, `EXPORT_ERROR`.
- Payload fields are `camelCase`; emitted CSS property keys are kebab-case (`css['border-top']`).

### TypeScript
- `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `isolatedModules` — all on. A stray unused import fails `npm run typecheck`.
- **No `any`, no `@ts-ignore`** anywhere in `src/`. Keep it that way.
- **No path aliases.** No `baseUrl`/`paths` — always relative imports (`'../types/messages'`).
- `isolatedModules` forbids `const enum`; use `export type` for type-only re-exports.
- **Type-narrowing idiom:** probe with `'prop' in node && typeof node.prop === 'number'` before reading. Do **not** cast `SceneNode` to a concrete interface.
- `figma.mixed` is never referenced. Mixed values are detected structurally with `typeof x !== 'symbol'`.

### Error handling — three established patterns

```ts
// (a) Guard-and-fallback: probe, then swallow with a comment
try { css = await node.getCSSAsync(); }
catch { css = { width: `${width}px`, height: `${height}px` }; }

// (b) Narrow-then-message: never let an unknown escape
catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Export failed';
  figma.ui.postMessage({ type: 'EXPORT_ERROR', error: message });
}

// (c) Hook-level success flag with a second fallback path
try { await navigator.clipboard.writeText(text); success = true; }
catch { success = false; }
```

**No error is ever thrown across the `postMessage` boundary** — failures become `EXPORT_ERROR` messages or fallback data.

### Async
- `figma.on('selectionchange', () => { handleSelectionChange(); })` is deliberately **fire-and-forget** (no `await`, no `.catch`) — the sequence guard handles staleness.
- `figma.ui.onmessage` is an `async` assignment with an early `return` per message type.

### State management
- **No state library, no context.** `App.tsx` owns `SelectionState` and `isExporting`.
- Transient UI state is local: `tab` in `CodeViewer`, `format` in `ColorPalette`, `showShortcuts` in `Header`.
- The only cross-cutting state is `useClipboard()`, threaded down as `onCopy` / `copiedText` props. All other children are pure.
- Wrap callbacks used in effect dependency arrays in `useCallback`.

### Styling
- Tailwind utility classes only — no CSS modules, no styled-components.
- **The palette is Catppuccin: Latte in light mode, Mocha in dark mode.** It is wired through CSS custom properties in `src/ui/styles.css` (`:root` = Latte, `.dark` = Mocha) and exposed as semantic tokens in `tailwind.config.js`.
- **Use semantic tokens, never raw Tailwind palette shades.** `bg-surface0`, `text-subtext1`, `border-surface1`, `text-mauve`, `bg-green/10`. Classes like `bg-slate-800` or `text-emerald-500` are a bug — they ignore the palette.
- **Do not add `dark:` colour variants.** The token values swap per mode, so one class covers both. `bg-surface0` is correct; `bg-surface0 dark:bg-slate-800` is redundant and wrong.
- Token vocabulary: structural `base` `mantle` `crust` `surface0` `surface1` `surface2` `overlay0` `overlay1` `overlay2` `subtext0` `subtext1` `text`; accents `rosewater` `flamingo` `pink` `mauve` `red` `maroon` `peach` `yellow` `green` `teal` `sky` `sapphire` `blue` `lavender`.
- Opacity modifiers work on tokens (`bg-green/10`, `border-blue/40`) and are the idiom for tinted zones — prefer one translucent accent over `-50`/`-950` pairs.
- Because `.dark` swaps the meaning of `base` and `text`, inverted surfaces need no variants: `bg-text/95 text-base` renders a dark pill in light mode and a light pill in dark mode (see `Toast`).
- `darkMode: 'class'` is configured; `useFigmaTheme()` toggles `.dark` on `<html>` from Figma's `figma-dark` class and `prefers-color-scheme`.
- `styles.css` sets `user-select: none` globally. Any copyable region must opt back in with `select-all` (see `CodeHighlighter`).

### Figma API traps
- **`type` is required on every `postMessage`.** The UI switches on `msg.type`; a message without one is silently dropped.
- Opt-in booleans are `undefined` by default: test `paint.visible === false`, never `!paint.visible`.
- `node.strokes.length > 0` does not imply a visible border — find the first stroke with `visible !== false`.
- Figma font style names contain spaces (`"Semi Bold"`, `"Extra Light"`). `toTailwindFontWeight` normalizes with `replace(/[^a-z0-9]/g, '')` before matching, and checks specific weights (`extrabold`, `semibold`) before broad ones (`bold`). Preserve both properties when editing it.
- Scale tables (`SPACING_SCALE`, `RADIUS_SCALE`, `FONT_SIZE_SCALE`) use exact integer keys; fractional Figma values fall through to arbitrary syntax (`w-[123.45px]`, `rounded-[5px]`). `RADIUS_SCALE[4]` maps to `''` to emit bare `rounded`.
- Revoke blob URLs **asynchronously** — `setTimeout(() => URL.revokeObjectURL(url), 1000)`. Synchronous revocation cancels the download.
- Clipboard is unreliable in the Figma iframe: try `navigator.clipboard` behind `window.isSecureContext`, then fall back to a hidden textarea + `document.execCommand('copy')`.
- `React.StrictMode` double-invokes effects in dev — keep effect cleanups correct.
- **`figma.fileKey` is doubly conditional.** It is readable only when `manifest.json` sets `enablePrivatePluginApi: true` **and** the plugin is private/local; a **publicly published plugin never receives a key**, regardless of the manifest. Any link feature must therefore degrade rather than assume a key exists — `code.ts` reads it behind a `typeof` guard and `buildNodeUrl` returns `null` when it is absent. Removing the manifest flag silently downgrades every link to the node-id fallback.
- **Video export (`MP4` / `GIF` / `WEBM`) accepts one node shape and nothing else: a frame placed directly on a page, with animated content.** The entire frame is encoded across the animation's duration — a nested animated frame, or an individual layer that merely has keyframes, **rejects**. A frame inside a **Section** is the top-most frame yet is *not* placed directly on a page, so `resolveVideoFrame` returns `undefined` for it too. Resolve the encodable frame in `src/code/video-frame.ts` (`resolveVideoFrame`), never by hand at the call site.
- **`getTopLevelFrame()` promises less than it looks like.** Its contract is "the top-most frame **that contains** this node … `undefined` if the node is not inside a frame" — self-return for a node that already *is* a top-level frame is **not** stated, and such a frame is by definition not *inside* a frame. The most common workflow (select a frame, export it) therefore cannot lean on it; `resolveVideoFrame` handles that case explicitly and only consults `getTopLevelFrame()` for nodes nested in something. That call **also throws outside Figma Design** (FigJam, Slides), so it is wrapped in a `try`.
- **`figma.ui.postMessage` carries `Uint8Array` through structured clone.** Binary payloads (PNG, `VIDEO_EXPORT_RESULT`) are posted as `Uint8Array` and rebuilt into a `Blob` on the UI side — `new Blob([bytes], {type})`. The UI still checks `bytes instanceof Uint8Array` before downloading and `alert`s otherwise, because a regression to `Array.from(bytes)` would ship a `number[]` that produces a plausible-looking but corrupt file instead of failing loudly.

---

## Important Files

| File | Role |
|---|---|
| `src/code/code.ts` | **Sandbox entry point** (referenced by `manifest.json` `main`). `showUI`, relaunch data, sequence guard, `onmessage` router. |
| `src/code/extractors.ts` | `extractNodeData(node)` — the single scene-graph reader. |
| `src/code/color-utils.ts` | Hex/RGBA/HSL conversion, `extractColorsFromNode` (node + **one** level of children), `uint8ArrayToString`. DOM-free. |
| `src/types/messages.ts` | **The wire contract.** Start here when adding a feature that crosses threads. |
| `src/utils/tailwind-transpiler.ts` | `transpileToTailwind(data)` — pure `NodeInspectionData` → class string. Ordering buckets: layout → sizing → spacing → typography → visuals. |
| `src/utils/tailwind-scale.ts` | Scale tables + `toTailwind*` converters. |
| `src/ui/App.tsx` | **UI entry point.** Message listener, `downloadBlob`, component composition. |
| `src/ui/components/CodeViewer.tsx` | Tab switching, `formatCss()` merge fallback, in-plugin shortcuts. |
| `manifest.json` | Figma manifest. `main` → `dist/code.js`, `ui` → `dist/index.html`. |
| `vite.config.ts` | `root: src/ui`, `emptyOutDir: false`, `viteSingleFile()`. |
| `tsconfig.json` | Single config covering **both** `src/code` and `src/ui`. |
| `vitest.config.ts` | `include: tests/**/*.{test,spec}.{ts,tsx}`, `globals: true`. |

---

## Runtime/Tooling Preferences

- **Runtime: Node.js ≥ 18, npm ≥ 9.** No Bun/Deno-specific APIs; npm is the package manager (`package-lock.json` committed).
- **Module system:** ESM everywhere (`"type": "module"` in `package.json`). Configs use `export default`.
- **esbuild has no config file** — all flags are inline in `package.json`. It never reads `tsconfig.json`, so `tsc` is the type authority and esbuild is the transpiler.
- **Both bundlers target `es2020`** (Figma's QuickJS engine).
- **`vite-plugin-singlefile` is required**, not optional: `manifest.json` names exactly one HTML file and the iframe cannot resolve sibling asset URLs. `assetsInlineLimit` and `chunkSizeWarningLimit` are set to `100000000` to force full inlining.
- **Vite is pinned to `^7` on purpose — do not bump it to 8 without also bumping `@vitejs/plugin-react`.** `@vitejs/plugin-react@4.7.0` peer-requires `vite ^4.2 || ^5 || ^6 || ^7`, so raising Vite to 8 makes `npm install` unresolvable (`ERESOLVE`). `@vitejs/plugin-react@6` supports Vite 8 but pulls in three additional peers (`oxc-transform-react`, `@rolldown/plugin-babel`, `babel-plugin-react-compiler`). Vite 7 is also the floor that clears the path-traversal advisory affecting `vite <=6.4.2`. Verify with `npm audit` and a clean `npm ci` after any dependency bump.
- **After changing dependencies, run `npm ci && npm audit && npm run typecheck && npm test && npm run build`.** Peer conflicts surface at install time, not at build time.
- **Never add a network dependency.** No CDN imports, no web fonts, no external images. Runtime dependencies (`react`, `react-dom`, `lucide-react`) are inlined into the bundles.
- **Never edit `dist/`** — gitignored and regenerated. `node_modules/` and `dist/` are the only ignored paths.
- **`typeRoots` overrides the default array.** `figma` typings resolve only because `./node_modules/@figma` is listed. Never drop either entry.
- **Caveat:** one `tsconfig` with DOM libs covers the sandbox too, so DOM globals (`document`, `window`) *typecheck* inside `src/code/` even though they do not exist at runtime. Types are not a safety net there — enforce it by review.

---

## Testing & QA

**Framework:** Vitest 2, configured in `vitest.config.ts` (`globals: true`, so `describe`/`it`/`expect` need no import in most files). Run with `npm test`.

**Before declaring any change done:**

```bash
npm test && npm run typecheck && npm run build
```

### Conventions
- One test file per unit under test: `tests/<module-name>.test.ts`.
- `describe` is named after the source module; each `it` states the observable behavior, not the implementation.
- Assert on observable output — generated class strings, emitted CSS, converted color values. Do **not** assert on field copies, defaults, or wiring.
- Figma nodes are faked with a plain object literal plus a double cast:
  ```ts
  const node = { id: 'n1', type: 'FRAME', strokes: [...], } as unknown as SceneNode;
  ```
  `extractNodeData` guards every Figma call with `'method' in node`, so partial mocks work and no Figma runtime is needed.
- Tests are deterministic and side-effect free — no network, no filesystem writes, no timers.

### Current coverage

| File | Focus |
|---|---|
| `tests/border-extraction.test.ts` | Border scoping — node-owned stroke produces a border; a parent with **child-only** strokes must NOT; zero weight defaults to `1px`; `dashPattern` → dashed vs dotted. |
| `tests/tailwind-transpiler.test.ts` | End-to-end class output for button, card, text, asymmetric padding, per-corner radii. |
| `tests/tailwind-scale.test.ts` | Scale converters — spaced Figma weight names, specific-over-broad weight precedence, exact-scale vs arbitrary-value fallback for dimensions/radii/font sizes. |
| `tests/border.test.ts` | Border → Tailwind: uniform, single-side, arbitrary widths, styles. |
| `tests/color-utils.test.ts` | RGB→HEX/RGBA/HSL, fills/strokes extraction, gradient stops. |
| `tests/code-viewer.test.ts` | Renders the real `CodeViewer` via `renderToStaticMarkup` — CSS/Tailwind/SVG tabs exist, CSS stays the default, the `3`/`S` SVG shortcut hint, and CSS border merging. |
| `tests/code-highlighter.test.ts` | Renders the real `CodeHighlighter` via `renderToStaticMarkup` — line numbering, property/value tokenization, hex swatches, comment lines, Tailwind token families, SVG element/attribute/value tokenization. |
| `tests/node-link.test.ts` | `src/utils/node-link.ts` — the pure URL builder. Separator conversion (`1:2` → `1-2`, and *every* separator, not just the first); `null` when the file key is missing or empty; slug sanitisation of spaces, `/`, `#`, `&`; blank/whitespace-only names dropping the path segment; leading and trailing separators collapsing (`Design /`, `/Design`, `-`). |
| `tests/node-link-component.test.ts` | Renders the real `NodeLink` via `renderToStaticMarkup` (no jsdom). The deep link when a file key is present, the **URL-form** fallback when it is not, and that the fallback is labelled "node ID in URL form" with the API form named in the note — the two forms are genuinely different strings. |
| `tests/manifest.test.ts` | Manifest schema — required fields, `relaunchButtons[].name`/`command` are strings, `main`/`ui` point at `dist/`, and `enablePrivatePluginApi` is pinned to `true` (the sole prerequisite for a readable `figma.fileKey`; the test asserts the length of `relaunchButtons` so the schema check cannot go vacuous). |
| `tests/output-fidelity.test.ts` | Extraction vs. transpiler fidelity. Extraction: no vector export during `extractNodeData`; `opacity` reported independently of shadows and omitted at `1`; real shadow geometry/colour with inner-vs-drop and hidden/non-shadow effects skipped; Hug sizing mapped onto the physical axis; `ABSOLUTE` positioning flagged. Transpiler: `leading-*`/`tracking-*`, `w-fit`/`h-fit`/`self-stretch`, `absolute` + `left-[…]`/`top-[…]` offsets, real `shadow-[…]` and `opacity-*`, and **no** shadow class on a shadowless node. |
| `tests/sandbox-protocol.test.ts` | The message router in `src/code/code.ts`. Stubs the `figma` global and `__html__`, then imports `code.ts` **dynamically** because the module reads those globals while its body evaluates (a static import would be hoisted ahead of the stubs and throw). `REQUEST_EXPORT`: SVG `view`/`copy`/`download` action passthrough, the echoed `nodeId`, PNG `2x` default and explicit scale, file-name sanitisation, `EXPORT_ERROR` on an empty selection, and `EXPORT_ERROR` when the export itself throws. `REQUEST_VIDEO_EXPORT`: the resolved top-level frame (not the selection) is encoded, MP4 gets settings + `quality` while GIF gets `loopCount`, an out-of-set fps is clamped rather than forwarded, bytes ship as a `Uint8Array`, a selection with no enclosing frame is refused, and an encode failure names the **encoded frame**. |
| `tests/video-options.test.ts` | `src/utils/video-options.ts` — the pure option tables. The per-format fps sets stay distinct (Figma rejects an out-of-set rate), the documented defaults (`MP4` 30 / `GIF` 15) seed the panel, quality presets exist only for MP4, the scale list matches the API, and each format is paired with a matching MIME type + extension (a mismatch ships a corrupt file with a plausible name). `clampFps`: pass-through, nearest-allowed snapping (60 → 30 for GIF), "always returns something the format accepts" for any input, and the default fallback for non-finite input. |
| `tests/video-frame.test.ts` | `resolveVideoFrame` (`src/code/video-frame.ts`) — the resolver that decides what Figma will encode. A frame placed directly on a page is accepted **without** relying on `getTopLevelFrame()` self-return (the mocked call returns `undefined` for it, mirroring the docs); a nested layer walks up to its enclosing top-level frame; a frame whose parent is a **Section** is rejected (top-most, but not placed directly on a page); a node with no enclosing frame and an empty selection are rejected; and a `getTopLevelFrame` that throws (FigJam/Slides) returns `undefined` instead of escaping. |
| `tests/video-export-component.test.ts` | Renders the real `VideoExport` via `renderToStaticMarkup` (no jsdom; this covers the initial MP4 render plus the disabled state without testing-library, which is not installed). Names the frame that will be encoded — not the selection — and says the whole frame is encoded, opens on MP4 with a specific quality control and **no** loop control (the interactive GIF switch itself is not exercised), offers only the fps rates MP4 accepts (never `8`), labels the action `Download MP4` for the current format, and disables it with an `Encoding…` label while in flight. |

### Known gaps
- **No React interaction tests.** Components are covered only by static markup rendering (`code-highlighter.test.ts`, `code-viewer.test.ts`, `node-link-component.test.ts`, `video-export-component.test.ts`). Event handlers, effect lifecycles, and the `App` message listener are untested — verify those by reloading in Figma. The `VideoExport` format switch is the concrete gap: only the MP4 render is asserted, so the GIF branch (loop control) is proven by hand in the browser, not by a test.
- **Sandbox coverage is partial.** `sandbox-protocol.test.ts` covers the `REQUEST_EXPORT` and `REQUEST_VIDEO_EXPORT` routers, but the `selectionchange` path and the sequence guard are still untested.
- There is **no linter and no formatter configured**. There is no `lint` script. Match surrounding style by hand: 2-space indent, single quotes, semicolons, trailing commas, ~100-column soft wrap.
