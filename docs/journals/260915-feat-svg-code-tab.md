# Journal: SVG Code Tab in the Dev Inspector

**Date:** 2026-09-15  
**Topic:** Surface the already-extracted SVG markup as a third, highlighted code tab  
**Author:** AI Agent (`ck:cook`)  

---

## 1. Context & Motivation

The inspector showed only two code views — **Pure CSS** and **Tailwind** — even though the third artifact developers need most often when handing a layer to code (its vector markup) was already in hand.

Figma exports the SVG in the sandbox: `src/code/extractors.ts` calls `node.exportAsync({ format: 'SVG' })`, decodes the bytes with `uint8ArrayToString` (JSON-safe `string`, since `Uint8Array` cannot cross `postMessage`), and ships it as `data.svg` on the existing `SELECTION_CHANGE` payload. That contract is unchanged.

Until now `svg` had exactly one consumer — `QuickExport`'s synchronous "Copy SVG" button — so the markup existed end-to-end but was never *displayed*. This change therefore required **no sandbox work, no IPC change, and no message-contract change**: purely a UI rendering change over data already present in `NodeInspectionData`.

---

## 2. Technical Decisions & Solutions

### A. Third tab, table-driven (`src/ui/components/CodeViewer.tsx`)

- Tab union widened to `type CodeTab = 'css' | 'tailwind' | 'svg'`; the switcher now renders `[ CSS ] [ Tailwind ] [ SVG ]`.
- The three hand-rolled tab buttons were replaced by two lookup tables — `TAB_ORDER` (render order) and `TAB_META` (per-tab `label`, `digit`, `letter`, `copyLabel`). Adding a tab is now a single data edit, and the button loop, the `title` tooltip, and the keyboard handler all read the same source of truth instead of repeating literal keys in three places.
- Keyboard shortcuts extended to `1`/`C` → CSS, `2`/`T` → Tailwind, `3`/`S` → SVG. The handler still ignores events originating in `INPUT`/`TEXTAREA` and only treats a modifier-free key as a tab switch.
- `codeByTab` gained `svg: data.svg ?? ''`; the Copy button's `copyLabel` is `'SVG markup'`. The **default tab remains CSS**.

### B. XML tokenizer (`src/ui/components/CodeHighlighter.tsx`)

`language` widened to `'css' | 'tailwind' | 'svg'` and the SVG branch renders numbered lines like the CSS branch. It reuses the same hand-rolled, dependency-free approach as the existing tokenizers (the plugin is strictly offline — `networkAccess.allowedDomains: ["none"]` — so no highlighter library was added).

- `SVG_TOKEN_RE` is a single alternation regex whose **order carries meaning**: comments (`<!-- … -->`) before tag punctuation; attribute names (`[A-Za-z_][\w:.-]*` with a `=` lookahead) before bare words; quoted values before words. Reordering the alternatives silently mis-tokenizes, so the regex is annotated in place.
- `tokenizeSvg(line)` walks `matchAll`, emitting the gap text between matches verbatim and classifying each token: comments (italic/dim), tag openers and closers (muted), the element name immediately after `<` (`expectElementName` flag, blue + medium), attribute names (`text-sky`), `=`, and quoted values.
- `renderSvgValue(quoted)` detects a hex literal inside a quoted value and renders it with a live `Swatch` (`text-peach`); every other quoted value renders as a plain green string. Numbers, ids, and `viewBox` values therefore stay plain — no misleading colour chip.
- Empty input renders a per-language placeholder; for SVG it is `<!-- No SVG available for this layer -->`, which doubles as a valid markup hint.
- SVG lines use `whitespace-pre-wrap break-all`, because a single exported `<path d="…">` is one enormous line: it now wraps instead of overflowing the panel.

### C. Shared `Swatch`

Three call sites had duplicated the same inline colour-chip `<span>` (CSS hex values, Tailwind arbitrary-value chips, and now SVG attribute values). They were collapsed into one `Swatch` component taking `hex` and `size`, so the chip's shape, border, and shadow are defined once.

---

## 3. Defects Found in Review and Fixed

1. **Ctrl/Cmd+C bypassed the empty-content guard** (`CodeViewer.tsx`). The Copy button is `disabled={!activeCode}`, so a node whose SVG export failed (or any empty tab) could not be copied by click. The keyboard path called `onCopy(activeCode, …)` unconditionally: `useClipboard` faithfully calls `navigator.clipboard.writeText('')`, which *clears* the clipboard, and then reports success — a false "Copied SVG markup!" toast on top of destroyed clipboard contents. The shortcut now mirrors the button's condition (`if (activeCode)`).
2. **Tests pinned the palette instead of the contract** (`tests/code-highlighter.test.ts`). The colour assertions matched exact palette class names in a CSS-variable-driven theme, so a legitimate re-theme would fail tests that were not testing behaviour. They now assert *distinguishability* — the set of classes used for element name, attribute name, and value must contain three distinct entries, same for two Tailwind utility families. A negative assertion could also never fail as written; it now asserts the observable invariant (only a swatch can emit `background-color` in SVG output) against a non-colour value.

---

## Verification

- **Tests:** 42 passed across 8 files (`npx vitest run`) — `tests/code-viewer.test.ts` was added for tab presence, the CSS default, the `3`/`S` hint, and CSS border merging.
- **Mutation test:** flipping the default tab to `svg` fails the default-tab assertion, so that test is load-bearing rather than decorative.
- **TypeScript:** `npx tsc --noEmit` — 0 errors.
- **Build:** `npm run build` succeeds (singlefile bundle regenerated).
- **Visual:** verified in a real browser against a Latte-styled render — line-number gutter, element/attribute/value token colours, hex fill swatches, wrapped long `path` lines, and italic comment styling all confirmed.
- **Docs:** `README.md`, `AGENTS.md`, and `docs/installation-guide.md` updated for the new tab and shortcut.
