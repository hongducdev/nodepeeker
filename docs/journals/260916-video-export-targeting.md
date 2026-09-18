# Journal: Video Export Targeting — Encoding the Selected Layer, Not the Page

**Date:** 2026-09-16  
**Topic:** Stop MP4 export from encoding the entire page frame when a single video layer is selected, and survive Figma's plan resolution limit  
**Author:** AI Agent (`ck:fix`)

---

## 1. Reported Symptoms

Two, from the user, on the same feature:

1. `Export failed: Could not encode "landing": Video export at 1920×21327 / 30fps exceeds the 1920×1080 / 30fps limit for this plan.` — Figma refused the encode outright.
2. *"gif đã export đúng nhưng export video thì đang gặp lỗi. nó đang export cả design cả trang thành một video chứ không phải video t đang chọn"* — GIF was correct, but MP4 produced the whole page instead of the selected layer.

Both are one root cause plus one platform limit.

---

## 2. Root Cause

### 2.1 `resolveVideoFrame()` walks **up**, and it was the only resolver on the export path

```ts
const frame = resolveVideoFrame(figma.currentPage.selection[0]);
// ...
await frame.exportAsync({ format: 'MP4', ... })
```

`resolveVideoFrame` exists to answer *"what frame would Figma encode"*, and it answers by walking up to the page-level frame — precisely its job. But using it **first** meant the selected node was discarded before the encode: a 73 × 73 video layer inside a 21,327 px-tall page frame became a request to encode the page frame. Figma did exactly that, then refused it for exceeding the plan's 1920 × 1080 box.

The two halves of the symptom are the same defect seen at two sizes: a page that *does* fit quietly ships the wrong video; a page that does not fit fails loudly.

### 2.2 Figma only encodes a page-level frame — so "just my layer" is not always reachable

Per the API: *"The exported node must be a top-level frame (a frame placed directly on a page) whose content is animated; … Calling video export on any other node — including a nested animated frame, or an individual layer that has keyframes but is not itself a top-level frame — rejects."*

So for a **nested** MP4 layer there is no encoder path to that layer alone, and no raw-bytes path either: `PluginAPI` exposes `createVideoAsync` (→ `Video`, which carries only `hash`) but **nothing that reads a video's bytes back**. GIF is the exception, and that is why GIF already worked (§3.1). This is a platform boundary, not a defect in the plugin — the honest fix is to be truthful about which node will be encoded.

---

## 3. Fix

### 3.1 GIF: raw passthrough (unchanged, but it is the reason GIF was already correct)

A GIF layer's bytes live in an `ImagePaint`'s `imageHash`, reachable through `figma.getImageByHash(hash).getBytesAsync()`. `extractRawGifBytes()` reads them, checks the `GIF` magic bytes, and returns the original file — no encode, **no plan limit**, no quality loss, and it works whether or not the layer is nested. MP4 has no equivalent, which is the asymmetry that made one format work and the other not.

### 3.2 MP4: selected layer first, enclosing frame second

`code.ts` now runs a three-step chain on the live selection:

| Step | Action | Why this order |
|---|---|---|
| 1 | `extractRawGifBytes(selectedNode)` when `format === 'GIF'` | Original bytes, no encoder, no plan limit |
| 2 | `exportNodeAsVideo(selectedNode, …)` | Encodes **the layer the user selected**; this is the reported bug's fix |
| 3 | `exportNodeAsVideo(resolveVideoFrame(selectedNode), …)` | Only when step 2 is rejected — a miss degrades to the old behaviour instead of failing |

Step 3 names the downloaded file after **the frame**, not the selection, because the frame is what the bytes contain. The filename is therefore the record of which path ran — a debugging affordance worth keeping deliberately.

### 3.3 Plan-limit clamp

`exportNodeAsVideo` measures whichever node it is handed: when `width × scale` or `height × scale` exceeds `1920 × 1080`, the constraint becomes `{type: 'HEIGHT', value}` clamped to fit. A 1920 × 21327 page frame now exports at 1920 × 1080 instead of erroring.

### 3.4 The panel must not promise what the fallback contradicts

`isDirectMedia` originally meant "the selection carries a video/GIF fill", which was wrong for a nested video layer: the panel said *"Detected video in `<layer>` — direct asset export"* while step 2 would fail and step 3 would encode the page frame. It now reads:

```ts
if (isMediaGif || (isMediaVideo && frame?.id === node.id)) { /* direct */ }
```

A **GIF** is direct wherever it sits (its bytes are read from the fill). A **video** is direct only when the selection *is* the node Figma will encode. A nested video gets the frame label instead, so the panel names the page frame before the click rather than after the download.

---

## 4. A Rejected Alternative, Recorded

The obvious workaround for §2.2 is to wrap a clone of the selection in a throwaway top-level frame, encode that, and delete it — which would make "just my video" work for nested layers.

It was implemented, then removed. `figma.createFrame()` + `appendChild` writes a **real node** into the user's document and their undo history, and NodePeeker is strictly read-only (`AGENTS.md`, Figma API traps). Export convenience does not outrank that contract. `exportNodeAsVideo` now carries a comment saying so, and `tests/sandbox-protocol.test.ts` asserts the `figma` mock exposes no `createFrame` — so a future pass cannot reintroduce the workaround without deleting a test that names the reason.

---

## 5. Verification

- **Unit:** 179 tests across 17 files. New: the selected layer is the node encoded while the page frame is untouched (`expect(pageFrameExport).not.toHaveBeenCalled()`); the enclosing frame is used only after the layer export throws; the fallback names the encoded frame; the mock exposes no `createFrame`; the Dev Mode hint renders for an unreadable video fill and stays out of the way otherwise.
- **Mutation-tested:** disabling the step-2 attempt (`if (false && …)`) fails the regression test, `expected "vi.fn()" to be called 1 times, but got 0 times` — the test binds to the routing, not to the plumbing.
- **Live (Figma Desktop, via computer use):** selecting a static `footer` group renders the Animation & Video Export section blurred with the *"Chỉ hỗ trợ Video hoặc GIF"* overlay and every control disabled — the previous pass's dimming still holds after the routing change. Selecting the GIF layer reports *"Detected GIF in icon-256x256 1 — direct asset export"* and downloads the original GIF (confirmed by the user: *"gif đã export đúng"*).
- **TypeScript:** `npx tsc --noEmit` — 0 errors. **Build:** `npm run build` — `dist/code.js` 30.5 kB.

---

## 6. The Dev Mode Question

The user pushed back on §2.2: *"trong dev mode có thể làm điều đó vậy Figma đang mở cửa riêng cho Figma"* — Dev Mode can do it, so Figma is keeping a door for itself. **That is correct, and it sharpens the diagnosis rather than overturning it.** Two separate capabilities were being conflated:

| Capability | Figma's UI | A plugin |
|---|---|---|
| Download the **original** video file | Yes — Dev Mode → Assets → download | **No API exists** |
| Encode a video/animation to MP4/GIF | Yes, on a page-level frame | Yes, via `exportAsync` on a page-level frame |

The plugin API is deliberately asymmetric about asset bytes: images have `getImageByHash(hash).getBytesAsync()`, videos expose only `videoHash` (and `Video`, what `createVideoAsync` returns, exposes only `hash`). There is **no `getVideoByHash`** — confirming it locally means enumerating every video symbol in `@figma/plugin-typings` (nine, none a reader), and Figma's own forum has an open feature request for exactly this: *"Plugin API request: read video fill bytes or URL from VideoPaint"*, whose accepted workaround is Dev Mode's asset download.

So "Figma reserved it for itself" is not a suspicion, it is the documented state — and the plugin cannot fix it. What the plugin *can* do is stop being a dead end: when the selection paints a video whose bytes are unreachable, `VideoExport` now renders the Dev Mode pointer (`hasVideoFill && !isDirectMedia`) instead of leaving the user with a frame export they did not ask for and no route to their own file. The hint is gated on the fill type rather than shown always, because a GIF *is* readable (`extractRawGifBytes`) and the note would be noise there.

**Evidence:** local typings enumeration (`createVideoAsync`, `VideoPaint.videoHash`, `Video {hash}`, `VideoExportConstraint`, `setMediaAsync`, `getMediaContent` on Figma Buzz — no reader); Figma docs on `exportAsync` video rejecting nested frames and individual layers; Figma forum threads `is-there-a-getvideobyhash-video-videohash-function-31647` and `plugin-api-request-read-video-fill-bytes-or-url-from-videopaint-55328`.

---

## 7. Known Limitations

- **A video layer nested inside a page frame cannot be exported as itself.** Figma's encoder rejects it and no API reads a video's bytes, so the export falls back to the enclosing page frame (§3.2 step 3) — the panel says so before the click. Nothing short of mutating the document can change this; the Dev Mode pointer (§6) is the only route to the original file.
- **The Dev Mode hint's UI path is corroborated, not walked.** `Dev Mode → Assets → Download` and the `Shift + D` shortcut come from Figma's forum guidance for extracting embedded videos; the toggle could not be located through the accessibility tree in this session, so the copy rests on that source rather than a hands-on click-through.
- **The `1920 × 1080` clamp is a guess at the plan box.** Free/starter is what produced the observed error; a paid plan may allow more, and the plugin cannot read the plan, so a paid user loses resolution they were entitled to. Detecting the limit from the first rejection and retrying is the principled version, if it ever matters.
- **The clamp maps a tall frame to 1920 × 1080 without preserving the frame's own aspect**, so a 1920 × 21327 page encodes to a 1920 × 1080 crop-by-scale — the whole frame squeezed, not a region of it.
