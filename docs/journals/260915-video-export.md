# Journal: Video Export — Encoding a Frame Without Shipping an Encoder

**Date:** 2026-09-15  
**Topic:** Export a layer's animation as MP4 or GIF, and move binary payloads across the message boundary without expanding them into JavaScript numbers  
**Author:** AI Agent  

---

## 1. Context & Motivation

The inspector answers *what is this layer* and can already export a static PNG or its SVG markup. It did not answer *show me the motion* — so an animated frame's only route out of Figma was the app's own export dialog. The plugin now resolves the frame that will be encoded, renders an **Animation Export** section (`src/ui/components/VideoExport.tsx`), and downloads MP4 or GIF.

The section is gated, not always on: it appears only when a frame resolves from the current selection, and it names that frame in text (`Encodes the whole frame, not the layer: …`) because the frame encoded is often *not* the layer selected — selecting a child inside a frame exports the whole enclosing frame.

---

## 2. The Constraint That Shaped the Feature

Two properties of Figma's API, not design preference, determined the whole shape:

- **Figma encodes both formats natively.** `exportAsync` has a dedicated overload returning a `Uint8Array` for `MP4` and `GIF`. No encoder library was added; bundling one would have traded the project's offline-first contract for a capability the platform already provides.
- **The exported node must be a frame placed directly on a page with animated content.** Anything else rejects: a nested layer, a frame inside a Section, a rectangle, or a selection with no enclosing frame. The feature therefore cannot offer a generic "export selection as video" affordance — it must resolve, up front, the one node the API will actually accept, and it must be honest when there is none.

---

## 3. Design

### A. The resolver exists because self-return is not promised (`src/code/video-frame.ts`)

`getTopLevelFrame()` is documented only as *"the top-most frame that contains this node. If the node is not inside a frame, this will return `undefined`."* That covers a layer nested in a frame. It does **not** state that a directly-selected top-level frame returns itself — and such a frame is by definition not "inside" a frame. Depending on self-return would break the most common workflow: selecting a frame and exporting it.

`resolveVideoFrame(node)` handles that case explicitly (`node.type === 'FRAME' && node.parent?.type === 'PAGE'`) before ever calling the API. It then rejects a frame whose parent is a Section — still "the top-most frame that contains this node", but not placed directly on a page — and wraps the call in `try`/`catch`, because `getTopLevelFrame` throws outright outside Figma Design (FigJam, Slides). The review flagged the self-return risk; this resolver is the fix.

The single resolver feeds both sides: the sandbox re-resolves from the live selection rather than trusting anything the UI sent back, and the extracted `topLevelFrame` field gates the UI section.

### B. `topLevelFrame` rides on the inspection payload (`src/code/extractors.ts`, `src/types/messages.ts`)

The UI cannot compute this itself — it has no `SceneNode` to walk. `NodeInspectionData` therefore carries `topLevelFrame?: { id, name }`, resolved during the same extraction pass (`src/code/extractors.ts`). It is absent, not a placeholder, when nothing resolves, so the UI gate is a single truthiness check. Its `name` is the string the section displays.

### C. Options are pure and format-specific (`src/utils/video-options.ts`)

Figma accepts a different fps set per format, so both the UI selects and the sandbox-side guard read `FPS_BY_FORMAT` rather than hard-coding lists of their own. `clampFps<F>(format, fps)` snaps an arbitrary rate onto the set the format actually accepts and is generic over the format, so its result is that format's literal union and can be handed straight to `exportAsync` without a cast — a widened `number[]` would silently permit an out-of-set rate. `supportsQuality` distinguishes the two formats' controls: MP4 takes a quality preset, GIF takes a loop count instead, and the component swaps one select for the other (§ browser-verified below).

---

## 4. Architectural Change: Binary Transport

PNG and video payloads now cross `postMessage` as **`Uint8Array`**, not `number[]` (`PluginToUIMessage` in `src/types/messages.ts`). `postMessage` supports a typed array through structured clone; the previous `Array.from(bytes)` would expand a 10 MB video into ten million individual JS numbers at the boundary.

The UI refuses to guess if that regresses: `downloadBytes` in `src/ui/App.tsx` asserts `bytes instanceof Uint8Array` and **alerts** rather than writing. A silent failure here is the worst kind — the file would still carry the right name, extension and MIME while being corrupt, indistinguishable from a valid export.

---

## 5. In-Flight State Held Apart

Video export has its **own** flag (`isVideoExporting`), separate from the quick-export one. A video encode runs for seconds, and a selection change mid-encode fires an unrelated `EXPORT_RESULT` — the SVG view request — which would otherwise re-enable the button and permit a second concurrent encode. `EXPORT_ERROR` clears both flags, because a rejection is exactly the outcome a red button must not persist through.

---

## 6. Test Gaps Closed

The tester ran **differential probing** to classify every surviving mutation, surfacing 14 survivors. Of those: **1** was a proven equivalent mutant — a dead `includes()` fast path in `clampFps`, since removed (the reduce already returns an in-set value unchanged, so the branch could never fire) — and **2** were tie-break/seed cases unreachable from the UI. The remaining **9 were real test gaps**:

| # | Gap |
|---|---|
| 1 | `DEFAULT_FPS` was unpinned |
| 2 | MP4 fps was neither clamped nor pass-through-tested |
| 3 | Two error messages were unpinned |
| 4 | The failure message named the wrong node |
| 5 | The video payload bytes were entirely unasserted — the exact regression the transport change targets |

All 9 were closed; the 5 most important were re-mutated to confirm they now fail.

---

## 7. Known Limitations

Recorded so the next pass does not rediscover them:

- **Real Figma `getTopLevelFrame` semantics are unverified.** The resolver's central assumption — that a directly-selected top-level frame does not rely on self-return — is tested against mocks, not against Figma.
- **Section rejection is unverified.** A Section-nested frame is rejected by the resolver, but no real Figma run has confirmed the API's own behaviour for that case.
- **`clampFps` tie-breaks are deliberately unpinned.** For two equally-near rates the outcome depends on reduce order and the seed; that is unspecified and left unasserted rather than frozen by a test that would make an accident look intentional.
- **Structured-clone fidelity is unproven.** The `Uint8Array` boundary is tested against a mock that hands back the same object by reference, so the test proves the code path, not that Figma's real `postMessage` delivers an equivalent typed array.

---

## Verification

- **Tests:** 117 passed across 15 files. Video coverage: `tests/video-options.test.ts` (per-format fps sets, defaults, clamping and non-finite fallback, quality/scale options, MIME/extension pairing), `tests/video-frame.test.ts` (directly-placed frame without self-return, nested walk-up, Section rejection, no-frame and empty selection, throwing API), and `tests/video-export-component.test.ts` (both format states, including the quality→loop swap).
- **Mutation-tested:** 14 survivors classified; 1 proven equivalent mutant removed with its code, 9 real gaps closed, the 5 most important re-mutated and confirmed failing.
- **Browser-verified:** the section is hidden without a frame; names the frame when one is selected; switches MP4 → GIF with the quality control becoming a loop control; and the GIF result downloads as `image/gif` named `Loading - Loop.gif`.
- **TypeScript:** `npx tsc --noEmit` — 0 errors.
- **Build:** `npm run build` succeeds.
- **Contract:** still fully offline — export goes through Figma's own `exportAsync`; no encoder or other runtime dependency was added.
