# Repository Guidelines

## Project Overview

**Dev Inspector (CSS & Tailwind)** is a Figma plugin that restores core developer hand-off features for free Figma accounts (replacing paid Dev Mode). It opens as a 340×580 floating iframe on the canvas and provides four features:

1. **Code inspection** — Pure CSS (default tab) and auto-translated Tailwind CSS, with syntax highlighting.
2. **Color copier** — HEX / RGB / HSL for fills and strokes, 1-click copy.
3. **Visual box model** — bounds, padding, gap, corner radius, and border style.
4. **1-click export** — copy raw SVG, download SVG, download PNG @2x.

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
                          ├─ exportAsync({format:'SVG'})
                          └─ border from strokes + dashPattern
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

### Key architectural rules

- **Race guard is mandatory.** `code.ts` keeps a module-level `let selectionSequence = 0`. Each handler run captures `const seq = ++selectionSequence` *before* awaiting and re-checks `if (seq !== selectionSequence) return;` *after every await*. Without this, a slow `getCSSAsync()` from an earlier selection overwrites a newer one.
- **Derive, don't store.** Tailwind classes are computed during render (`CodeViewer` calls `transpileToTailwind(data)`), never held in state.
- **Extraction is async only because Figma is.** `getCSSAsync()` and `exportAsync()` return promises. Everything else in `extractors.ts` is synchronous.
- **Cross-boundary payloads are JSON-safe only.** `Uint8Array` cannot cross `postMessage`. PNG bytes travel as `Array.from(bytes)` → `number[]` and are rebuilt with `new Uint8Array(payload.bytes)`; SVG is decoded to a `string` first via `uint8ArrayToString`.

---

## Key Directories

| Path | Purpose |
|---|---|
| `src/code/` | **Sandbox thread.** Scene-graph reading, color math, message routing. Must stay DOM-free. |
| `src/ui/` | **UI thread.** React root (`App.tsx`, `main.tsx`), `components/`, `hooks/`, Tailwind entry `styles.css`, Vite entry `index.html`. |
| `src/utils/` | **Shared pure logic**, runs in the iframe. Tailwind scale tables and the transpiler. No Figma and no DOM dependency. |
| `src/types/` | `messages.ts` — the wire contract imported by both threads. |
| `tests/` | Vitest unit tests. Mirrors `src/code/` and `src/utils/` only. |
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
- Message `type` discriminants are SCREAMING_SNAKE: `SELECTION_CHANGE`, `REQUEST_EXPORT`, `INIT_REQUEST`, `EXPORT_RESULT`, `EXPORT_ERROR`.
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
- Every color utility has a `dark:` variant; `tailwind.config.js` sets `darkMode: 'class'` and `useFigmaTheme()` toggles `.dark` on `<html>`.
- `styles.css` sets `user-select: none` globally. Any copyable region must opt back in with `select-all` (see `CodeHighlighter`).

### Figma API traps
- **`type` is required on every `postMessage`.** The UI switches on `msg.type`; a message without one is silently dropped.
- Opt-in booleans are `undefined` by default: test `paint.visible === false`, never `!paint.visible`.
- `node.strokes.length > 0` does not imply a visible border — find the first stroke with `visible !== false`.
- Figma font style names contain spaces (`"Semi Bold"`). Substring matchers must be space-insensitive.
- Scale tables (`SPACING_SCALE`, `RADIUS_SCALE`, `FONT_SIZE_SCALE`) use exact integer keys; fractional Figma values fall through to arbitrary syntax (`w-[123.45px]`, `rounded-[5px]`). `RADIUS_SCALE[4]` maps to `''` to emit bare `rounded`.
- Revoke blob URLs **asynchronously** — `setTimeout(() => URL.revokeObjectURL(url), 1000)`. Synchronous revocation cancels the download.
- Clipboard is unreliable in the Figma iframe: try `navigator.clipboard` behind `window.isSecureContext`, then fall back to a hidden textarea + `document.execCommand('copy')`.
- `React.StrictMode` double-invokes effects in dev — keep effect cleanups correct.

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
| `tests/border.test.ts` | Border → Tailwind: uniform, single-side, arbitrary widths, styles. |
| `tests/color-utils.test.ts` | RGB→HEX/RGBA/HSL, fills/strokes extraction, gradient stops. |
| `tests/manifest.test.ts` | Manifest schema — required fields, `relaunchButtons[].name`/`command` are strings, `main`/`ui` point at `dist/`. |

### Known gaps
- **No React component tests.** No component is exercised; `CodeHighlighter`, `CodeViewer`, `BorderStyle`, `BoxModel`, and `App` have zero automated coverage. Verify UI changes by reloading in Figma and inspecting visually.
- **No sandbox integration tests.** `code.ts` message routing and the sequence guard are untested.
- **`tests/code-highlighter.test.ts` imports nothing from `src/`.** It re-implements tokenization over string literals and asserts on `Array`/`String` built-ins — it provides no real coverage and should not be treated as a safety net for `CodeHighlighter.tsx`.
- There is **no linter and no formatter configured**. There is no `lint` script. Match surrounding style by hand: 2-space indent, single quotes, semicolons, trailing commas, ~100-column soft wrap.
