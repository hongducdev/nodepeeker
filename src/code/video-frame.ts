/**
 * Resolve the frame that Figma will actually encode for a video export.
 *
 * Two documented facts drive this:
 *
 * 1. `exportAsync` requires "a top-level frame (a frame placed directly on a page)".
 * 2. `getTopLevelFrame()` is documented as "the top-most frame that contains this node. If
 *    the node is not inside a frame, this will return undefined" -- self-return for a node
 *    that already is a top-level frame is NOT stated, and such a frame is by definition not
 *    "inside" a frame. Relying on it would break the most common workflow: selecting a frame
 *    and exporting it.
 *
 * It also throws outside Figma Design (FigJam, Slides), so the call is guarded.
 */
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
