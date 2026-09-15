# Journal: Animation Detection — Gating Export on Motion, Not on Frame Resolution

**Date:** 2026-09-15  
**Topic:** Stop offering the Animation Export section for static frames by detecting encodable Motion animation before gating the UI  
**Author:** AI Agent (`ck:fix`)

---

## 1. Context & Motivation

The previous pass added the **Animation Export** section (`src/ui/components/VideoExport.tsx`) and gated it on `NodeInspectionData.topLevelFrame` — a field whose only question was *does the selection resolve to a frame placed directly on a page*. Every static frame answers yes to that. So selecting any top-level frame rendered a full MP4/GIF control panel, and pressing the button produced `exportAsync`'s rejection surfaced as a generic error.

That is a **dead action**: an affordance that cannot succeed. The section is not merely decoration — it promises an encode — so it must be gated on the one property that decides whether the promise holds: *does this frame actually carry encodable animation*.

---

## 2. Root Cause

The gate asked the wrong question. Frame resolution (a page-level frame exists) and encodability (that frame has Motion content) are independent:

- A page-level frame with no motion resolves fine, and `exportAsync` rejects it.
- The resolver in `src/code/video-frame.ts` had only ever been asked the first question, because that is all `exportAsync` needs to *address* a node.

The fix adds the second question rather than replacing the first, because the export path still needs the ungated answer (§5).

---

## 3. Detection: What Counts as Animation (`src/code/video-frame.ts`)

`resolveVideoTarget(node)` composes `resolveVideoFrame(node)` with `hasMotionAnimation(frame)` and returns `undefined` when either half fails. A frame counts as animated when **any** of these holds:

| Signal | Why it is a signal |
|---|---|
| `frame.timelines.length > 0` | The frame's Motion timeline; it is also where `duration` lives. |
| `frame.animationStyles.length > 0` | Animation applied via styles without an accompanying timeline. |
| `Object.keys(frame.animations).length > 0` | Raw keyframes on the frame. |

Each access is wrapped: the property reads sit in a `try`/`catch` because these are newer API surfaces and a throw on an unsupported node must read as "no animation", not as a crash in the extraction pass.

**Duration:** the longest Motion timeline wins (`Math.max` over `frame.timelines`, non-finite values skipped, absent when no timeline carries one). The number is the user's only cue for how long the encode will take, so it is derived from what will actually be encoded.

### A. `reactions` is deliberately excluded

This is the non-obvious decision, and it is load-bearing. `reactions` — the prototype/interaction field — looks like the obvious "is this animated" flag, and it was rejected on two grounds:

- **It would not fix the bug.** Research established that `exportAsync` encodes timeline/Motion content, while interactive Smart Animate prototype flows cannot be resolved by `exportAsync` at all — they require driving the prototype player. A frame whose only motion is a `reaction` would still fail the export.
- **It would re-create the dead action.** Using `reactions` as a signal would widen the gate back to "animated-looking selections", which is precisely the failure class being fixed, just with a different member set.

So the signal set is chosen for *encodability*, not for *apparent animation*. This is recorded in a comment on `hasMotionAnimation` so the next pass does not "helpfully" add `reactions` back.

---

## 4. Contract Change: `topLevelFrame` → `video`

`NodeInspectionData` previously carried `topLevelFrame?: { id, name }`. It now carries:

```ts
video?: { frameId: string; frameName: string; durationSeconds?: number };
```

Two consequences, both intentional:

- **Presence is the gate.** The UI needs no re-derivation; `src/ui/App.tsx` renders `<VideoExport>` only when `selection.data.video` is set, and absence is the single truth for "nothing to export". This is what makes the static-frame case fall out for free.
- **The duration rides along.** The panel had no way to know how long the animation runs — the UI holds no `SceneNode` and cannot read `timelines`. Surfacing `durationSeconds` from the same detection pass costs nothing and turns the section header into evidence that detection actually ran: *Detected motion in `<frame>` · `<duration>`s — the whole frame is encoded, not the layer*.

---

## 5. Deliberate Asymmetry Between the Gate and the Export

Extraction and export use **different** resolvers, and that is a decision, not an oversight:

| Path | Resolver | Effect |
|---|---|---|
| Extraction (`src/code/extractors.ts`) → gates the UI | `resolveVideoTarget()` — frame **and** animation | A static frame shows no section. |
| Export handler (`src/code/code.ts`) → performs the encode | `resolveVideoFrame()` — frame only | A detection miss never blocks an export the user explicitly asked for. |

If the export path also required detection, a false negative in `hasMotionAnimation` (a Figma animation representation we did not model) would make the feature silently unreachable for a frame that *would* have encoded. The gate exists to avoid offering a doomed action, not to police one the user has already committed to. The export path keeps its own honest failure message for the case where Figma itself rejects.

---

## 6. Verification

- **Tests:** 127 passed across 15 files. `tests/video-frame.test.ts` covers the static-frame rejection, the timeline/`animationStyles`/keyframes signals, longest-timeline selection, non-finite duration, and the no-frame and Section-nested cases; `tests/video-export-component.test.ts` asserts the duration reaches the rendered text (`· 0.6s`), so a section that appeared without detection actually running would not pass.
- **Browser-verified:** a static frame renders no Animation Export section; an animated frame renders it with `· 0.6s` in the header text.
- **Mutation-tested:** three mutants were killed deliberately — (1) removing the animation gate, (2) dropping the `animationStyles`/`animations` signals, and (3) replacing max-duration with last-wins.
- **The duration mutation initially survived**, and the reason mattered: the multi-timeline test fed timelines in **ascending** order, where a last-wins loop returns exactly the same value as `max`, so the test could not distinguish the two implementations. The test data was corrected to **descending** order (`1.25` before `0.4`) and the mutation then failed. The surviving mutant was a test defect, not an equivalent mutant — recorded because the same trap (coincidental agreement between a bug and the expected value) applies to any fold-vs-last comparison.
- **TypeScript:** `npx tsc --noEmit` — 0 errors.
- **Build:** `npm run build` succeeds.

---

## 7. Known Limitations

- **The `timelines` ⟺ `exportAsync` correspondence is inferred, not confirmed.** The detection rests on documented API semantics: that `exportAsync` encodes Motion/timeline content, and that a Motion timeline is what makes a frame encodable. No run against real Figma has confirmed that every frame with a non-empty `timelines` encodes successfully, or that every encodable frame has one. The `animationStyles` and `animations` signals are wider on purpose, to absorb that uncertainty on the permissive side — the gate's failure mode is then "offers an export Figma may reject", which is the pre-fix behaviour, not a new one.
- **`reactions`-only frames are invisible to the UI.** A frame whose only motion is a prototype interaction shows no section. That is correct for `exportAsync` as documented, but it means the plugin is silent about a frame that is visibly animated in Figma — a discoverability gap, not a dead action.
- **Duration may be absent while the section still shows.** When motion comes from `animationStyles` or keyframes without a timeline, `durationSeconds` is `undefined` and the header omits the duration clause. Untested against real Figma data for which combinations produce that state.
