/**
 * Resolve the frame Figma would encode for a video export, and whether it actually has
 * encodable animation.
 *
 * Three documented facts drive this:
 *
 * 1. `exportAsync` requires "a top-level frame (a frame placed directly on a page) whose
 *    content is animated".
 * 2. `getTopLevelFrame()` is documented as "the top-most frame that contains this node. If
 *    the node is not inside a frame, this will return undefined" -- self-return for a node
 *    that already is a top-level frame is NOT stated, and such a frame is by definition not
 *    "inside" a frame. Relying on it would break the most common workflow: selecting a frame
 *    and exporting it.
 * 3. The encodable content is Motion/timeline animation. Prototype-only Smart Animate flows
 *    are not resolvable by `exportAsync`, so `reactions` is deliberately NOT a signal here --
 *    treating it as one would re-create exactly the dead action this guards against.
 *
 * It also throws outside Figma Design (FigJam, Slides), so the calls are guarded.
 */

export interface VideoTarget {
  frame: FrameNode;
  /** Longest Motion timeline on the frame, in seconds. Absent when the animation comes from
   *  applied styles or keyframes without an accompanying timeline. */
  durationSeconds?: number;
}

/** The frame Figma would encode, regardless of whether it has anything to encode. */
export function resolveVideoFrame(node: SceneNode | null | undefined): FrameNode | undefined {
  if (!node) return undefined;

  // The common case, handled without depending on undocumented self-return.
  if (node.type === 'FRAME' && node.parent?.type === 'PAGE') {
    return node;
  }

  try {
    const frame = node.getTopLevelFrame();
    // A frame nested in a Section is still "the top-most frame that contains this node",
    // but it is not placed directly on a page, so it cannot be encoded.
    return frame && frame.parent?.type === 'PAGE' ? frame : undefined;
  } catch {
    return undefined;
  }
}

/** Whether the frame carries Motion animation that `exportAsync` can encode. */
function hasMotionAnimation(frame: FrameNode): boolean {
  try {
    if (frame.timelines.length > 0) return true;
    if (frame.animationStyles.length > 0) return true;
    return Object.keys(frame.animations).length > 0;
  } catch {
    return false;
  }
}

/**
 * The frame plus its animation, or `undefined` when there is nothing to export. Callers gate
 * the export UI on this so a static frame never offers an action that would fail.
 */
export function resolveVideoTarget(node: SceneNode | null | undefined): VideoTarget | undefined {
  const frame = resolveVideoFrame(node);
  if (!frame || !hasMotionAnimation(frame)) return undefined;

  let durationSeconds: number | undefined;
  try {
    for (const timeline of frame.timelines) {
      if (Number.isFinite(timeline.duration)) {
        durationSeconds = Math.max(durationSeconds ?? 0, timeline.duration);
      }
    }
  } catch {
    durationSeconds = undefined;
  }

  return { frame, durationSeconds };
}
