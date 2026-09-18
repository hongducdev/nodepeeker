# Journal: Video/GIF Detection & Dimmed/Disabled UI State

**Date:** 2026-09-16  
**Topic:** Expand video, GIF, and motion detection across nodes/descendants and render the export section dimmed and unclickable when selecting non-video/GIF layers  
**Author:** AI Agent (`ck:fix`)

---

## 1. Context & Motivation

A user reported two issues:
1. Automatic detection of video or GIF was not working when selecting layers in Figma.
2. When selecting an element that is not a video or GIF, the section should remain visible but dimmed/blurred so users cannot click into it ("bổ sung giúp tôi nếu ấn vào phần không phải video hay gif thì phần đó sẽ bị mờ để người dùng không ấn vào được").

---

## 2. Root Cause Analysis

1. **Incomplete Detection Scope in `hasMotionAnimation`:**
   - Previous detection only inspected the top-level `frame`, ignoring `node` (the layer actually selected by the user) and any descendants of the frame. In real Figma designs, animations (applied `animationStyles`, `animations` keyframes, `manualKeyframeTracks`) are attached to child layers (e.g. buttons, icons, components), leaving the parent frame's `animationStyles` and `animations` empty.
   - Imported MP4, WebM, and animated GIFs in Figma are represented as `VIDEO` paint (`paint.type === 'VIDEO'`). These video fills were never checked.
   - Layers named with video/GIF extensions (e.g., `loading.gif`, `hero.mp4`) and layers with `exportSettings` configured for GIF/MP4 were not detected.

2. **Hidden vs. Dimmed UI Affordance:**
   - The UI previously conditionally removed the `VideoExport` component completely (`{selection.data.video && <VideoExport ... />}`).
   - When users clicked a static layer, the section disappeared entirely. The user expects the section to remain in the panel layout, but visually dimmed (`opacity-40 select-none`), with all controls disabled and `pointer-events-none` so it cannot be interacted with.

---

## 3. Implementation Details

1. **Robust Detection (`src/code/video-frame.ts`):**
   - Added `isNodeAnimatedOrVideo(target)`: checks for:
     1. Video fills (`fills.some(p => p.type === 'VIDEO')`)
     2. Media / Embed node types (`type === 'MEDIA' || type === 'EMBED'`)
     3. Motion timelines (`timelines.length > 0`)
     4. Applied animation styles (`animationStyles.length > 0`)
     5. Keyframes (`animations`)
     6. Manual keyframe tracks (`manualKeyframeTracks`)
     7. Prototype reactions (`reactions.length > 0`)
     8. Configured video/GIF export settings (`format === 'GIF' | 'MP4' | 'WEBM'`)
     9. Filename or layer name keywords (`.gif`, `.mp4`, `.webm`, `.mov`, `video`, `gif`, `animation`)
   - Updated `resolveVideoFrame(node)` to support components, instances, and standalone video/GIF layers directly on canvas pages.
   - Added `hasAnimationOrVideo(frame, node)`: checks `node`, `frame`, and searches descendants using `frame.findOne(...)` (with recursive child fallback for mock/offline environments).

2. **Dimmed/Disabled Section (`src/ui/components/VideoExport.tsx` & `src/ui/App.tsx`):**
   - Made `video` prop optional in `VideoExportProps`.
   - `App.tsx` now always renders `<VideoExport video={selection.data.video} ... />` for single-node selections.
   - When `video` is absent:
     - Content is visually blurred with `filter blur-[1.5px] opacity-25 pointer-events-none select-none`.
     - An overlay is rendered on top with `cursor-not-allowed` and a clear badge: *"Chỉ hỗ trợ Video hoặc GIF"* with guidance: *"Chọn layer video, ảnh động GIF hoặc frame có animation để mở khóa tính năng xuất file."*
     - Header displays a "Disabled" badge.
     - Format buttons, selects (fps, quality/loop, scale), and download button are all marked `disabled`.
     - Clicks are completely blocked.
   - When `video` is present:
     - Section renders at full opacity (`filter-none opacity-100`) with no overlay.
     - Shows detected layer name and duration.
     - All controls and export button are enabled and interactive.

3. **Selective Video Layer Export & Plan Limit Guard (`src/code/code.ts`):**
   - Added `exportNodeAsVideo()`: when a user selects an individual video layer or component inside a large page, the export encodes **only that selected layer**, avoiding encoding the entire 21,327px parent frame.
   - Added direct GIF extraction: reads raw `GIF89a` byte headers directly from `image.getBytesAsync()` for instant downloads with zero quality loss.
   - Added automatic constraint clamping: when an exported frame exceeds 1920×1080, height is automatically clamped to $\le 1080$px so Figma's starter/free plan video export limit is never exceeded.
   - Added auto-resize on `INIT_REQUEST`: automatically resizes plugin window to 340×640 to fit all action buttons.

---

## 4. Verification

- `npm run typecheck`: 0 errors.
- `npm test`: 174 passed across 17 test files (including new regression tests for direct GIF extraction and plan limit clamping).
- `npm run build`: successfully built `dist/code.js` (31.9kb) and inlined `dist/index.html` (213.5kb).
