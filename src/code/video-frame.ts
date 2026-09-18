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
import type { VideoFormat } from '../types/messages';

export interface VideoTarget {
  frame: FrameNode;
  /** Longest Motion timeline on the frame, in seconds. Absent when the animation comes from
   *  applied styles or keyframes without an accompanying timeline. */
  durationSeconds?: number;
  /** Recommended default export format based on node content (e.g. GIF for animated GIFs) */
  initialFormat?: VideoFormat;
  targetName?: string;
  isDirectMedia?: boolean;
  /** The selection paints an actual video (`VIDEO` paint), not just Motion animation. Figma
   *  reads video bytes for nobody but itself, so the UI points at Dev Mode for the original. */
  hasVideoFill?: boolean;
}

/** The frame Figma would encode, regardless of whether it has anything to encode. */
export function resolveVideoFrame(node: SceneNode | null | undefined): FrameNode | undefined {
  if (!node) return undefined;

  // Frame, Component, or Instance placed directly on a page
  if (
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') &&
    node.parent?.type === 'PAGE'
  ) {
    return node as unknown as FrameNode;
  }

  try {
    const frame = node.getTopLevelFrame();
    if (frame && frame.parent?.type === 'PAGE') {
      return frame;
    }
  } catch {
    // Continue
  }

  // If node is placed directly on a page and carries animation or video, treat node itself as the frame target
  if (node.parent?.type === 'PAGE' && isNodeAnimatedOrVideo(node)) {
    return node as unknown as FrameNode;
  }

  return undefined;
}

/** Whether an individual node carries video fills, gif, motion animation, or video export settings. */
export function isNodeAnimatedOrVideo(target: SceneNode | null | undefined): boolean {
  if (!target) return false;
  try {
    // 1. Media or Embed node type in Figma / FigJam
    if (target.type === 'MEDIA' || target.type === 'EMBED') {
      return true;
    }

    // 2. Video fill (MP4 / WebM / animated GIF uploaded to Figma)
    if ('fills' in target && Array.isArray(target.fills)) {
      if (target.fills.some((p) => p && p.visible !== false && p.type === 'VIDEO')) {
        return true;
      }
    }
    // 4. Motion animation styles applied
    if (
      'animationStyles' in target &&
      Array.isArray(target.animationStyles) &&
      target.animationStyles.length > 0
    ) {
      return true;
    }

    // 5. Motion animations keyframes
    if (
      'animations' in target &&
      target.animations &&
      typeof target.animations === 'object' &&
      Object.keys(target.animations).length > 0
    ) {
      return true;
    }

    // 6. Manual keyframe tracks
    if (
      'manualKeyframeTracks' in target &&
      target.manualKeyframeTracks &&
      typeof target.manualKeyframeTracks === 'object' &&
      Object.keys(target.manualKeyframeTracks).length > 0
    ) {
      return true;
    }

    // 7. Prototype reactions (Smart Animate / transitions)
    if ('reactions' in target && Array.isArray(target.reactions) && target.reactions.length > 0) {
      return true;
    }

    // 8. Configured export settings for video/gif
    if ('exportSettings' in target && Array.isArray(target.exportSettings)) {
      if (
        target.exportSettings.some(
          (s) => s && (s.format === 'GIF' || s.format === 'MP4' || s.format === 'WEBM')
        )
      ) {
        return true;
      }
    }

    // 9. Layer name indicating GIF, video, or animation (e.g. "hero.mp4", "loader.gif", "video", "gif")
    if (typeof target.name === 'string') {
      const lower = target.name.toLowerCase();
      if (
        lower.endsWith('.gif') ||
        lower.endsWith('.mp4') ||
        lower.endsWith('.webm') ||
        lower.endsWith('.mov') ||
        /\b(video|gif|animation|mp4|webm)\b/i.test(lower)
      ) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

/** Recursively search children if findOne is not available or for mock objects. */
function checkChildrenForMotion(node: SceneNode): boolean {
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      if (isNodeAnimatedOrVideo(child)) return true;
      if ('children' in child && checkChildrenForMotion(child)) return true;
    }
  }
  return false;
}

/** Inspect node fills for real video or GIF image fills by magic bytes. */
export async function checkNodeMediaAsync(
  node: SceneNode
): Promise<{ isGif?: boolean; isVideo?: boolean }> {
  try {
    if ('fills' in node && Array.isArray(node.fills)) {
      for (const paint of node.fills) {
        if (!paint || paint.visible === false) continue;
        if (paint.type === 'VIDEO') {
          return { isVideo: true };
        }
        if (paint.type === 'IMAGE' && paint.imageHash) {
          try {
            if (typeof figma !== 'undefined' && typeof figma.getImageByHash === 'function') {
              const image = figma.getImageByHash(paint.imageHash);
              if (image && typeof image.getBytesAsync === 'function') {
                const bytes = await image.getBytesAsync();
                // GIF magic header: 'GIF' (0x47, 0x49, 0x46)
                if (
                  bytes &&
                  bytes.length >= 3 &&
                  bytes[0] === 0x47 &&
                  bytes[1] === 0x49 &&
                  bytes[2] === 0x46
                ) {
                  return { isGif: true };
                }
              }
            }
          } catch {
            // Non-critical check
          }
        }
      }
    }
  } catch {
    // Non-critical check
  }
  return {};
}

/** Extract raw GIF file bytes from node image fills if it carries an animated GIF. */
export async function extractRawGifBytes(
  node: SceneNode | null | undefined
): Promise<Uint8Array | undefined> {
  if (!node) return undefined;
  try {
    if ('fills' in node && Array.isArray(node.fills)) {
      for (const paint of node.fills) {
        if (!paint || paint.visible === false) continue;
        if (paint.type === 'IMAGE' && paint.imageHash) {
          if (typeof figma !== 'undefined' && typeof figma.getImageByHash === 'function') {
            const image = figma.getImageByHash(paint.imageHash);
            if (image && typeof image.getBytesAsync === 'function') {
              const bytes = await image.getBytesAsync();
              if (
                bytes &&
                bytes.length >= 3 &&
                bytes[0] === 0x47 &&
                bytes[1] === 0x49 &&
                bytes[2] === 0x46
              ) {
                return bytes;
              }
            }
          }
        }
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/** Whether the frame or the selected node carries encodable animation or video/GIF content. */
export function hasAnimationOrVideo(frame: FrameNode, node?: SceneNode | null): boolean {
  // If the user selected a child layer inside the frame:
  if (node && node.id !== frame.id) {
    // The child layer itself MUST carry video, GIF, or animation
    return isNodeAnimatedOrVideo(node);
  }
  // If the user selected the frame itself:
  if (
    ('timelines' in frame && Array.isArray(frame.timelines) && frame.timelines.length > 0) ||
    isNodeAnimatedOrVideo(frame)
  ) {
    return true;
  }

  try {
    if ('findOne' in frame && typeof frame.findOne === 'function') {
      const found = frame.findOne((child) => isNodeAnimatedOrVideo(child));
      if (found) return true;
    }
  } catch {
    // Fall back to manual traversal below
  }

  return checkChildrenForMotion(frame);
}

/**
 * The frame plus its animation or video, or `undefined` when there is nothing to export.
 * Callers use this to determine if the selected layer/frame is an encodable video/gif/animation.
 */
export async function resolveVideoTarget(
  node: SceneNode | null | undefined
): Promise<VideoTarget | undefined> {
  if (!node) return undefined;

  const frame = resolveVideoFrame(node);
  const targetNode =
    frame || (isNodeAnimatedOrVideo(node) ? (node as unknown as FrameNode) : undefined);
  if (!targetNode) return undefined;

  const media = await checkNodeMediaAsync(node);
  const isMediaGif =
    media.isGif ||
    (typeof node.name === 'string' && /\.gif\b/i.test(node.name)) ||
    node.type === 'MEDIA' ||
    ('exportSettings' in node &&
      Array.isArray(node.exportSettings) &&
      node.exportSettings.some((s) => s && s.format === 'GIF'));
  const isMediaVideo =
    media.isVideo ||
    (typeof node.name === 'string' && /\.mp4\b/i.test(node.name)) ||
    node.type === 'EMBED' ||
    ('exportSettings' in node &&
      Array.isArray(node.exportSettings) &&
      node.exportSettings.some((s) => s && (s.format === 'MP4' || s.format === 'WEBM')));

  const isEligible = isMediaGif || isMediaVideo || hasAnimationOrVideo(targetNode, node);
  if (!isEligible) return undefined;

  let durationSeconds: number | undefined;
  try {
    const collectTimelines = (candidate: SceneNode) => {
      if (!('timelines' in candidate) || !Array.isArray(candidate.timelines)) return;
      for (const timeline of candidate.timelines) {
        if (Number.isFinite(timeline.duration)) {
          durationSeconds = Math.max(durationSeconds ?? 0, timeline.duration);
        }
      }
    };

    const collectKeyframeDurations = (candidate: SceneNode) => {
      if (!('animations' in candidate)) return;
      const animations = candidate.animations;
      if (!animations || typeof animations !== 'object') return;
      for (const anim of Object.values(animations)) {
        if (
          anim &&
          typeof anim === 'object' &&
          'timelineDuration' in anim &&
          Number.isFinite(anim.timelineDuration)
        ) {
          durationSeconds = Math.max(durationSeconds ?? 0, anim.timelineDuration);
        }
      }
    };

    collectTimelines(node);
    collectKeyframeDurations(node);
    if (frame) {
      collectTimelines(frame);
      collectKeyframeDurations(frame);
    }
  } catch {
    durationSeconds = undefined;
  }

  if (durationSeconds !== undefined) {
    durationSeconds = Math.round(durationSeconds * 100) / 100;
  }

  // A GIF layer is exported straight from its fill bytes, so it is direct wherever it sits.
  // A video layer is only direct when the selected node IS the node Figma will encode; nested
  // inside a page frame, Figma's encoder rejects it and code.ts falls back to that frame, so
  // claiming "direct" here would promise a layer export the fallback then contradicts.
  if (isMediaGif || (isMediaVideo && frame?.id === node.id)) {
    return {
      frame: node as unknown as FrameNode,
      targetName: node.name,
      durationSeconds,
      initialFormat: isMediaGif ? 'GIF' : 'MP4',
      isDirectMedia: true,
      hasVideoFill: media.isVideo,
    };
  }

  return {
    frame: targetNode,
    durationSeconds,
    initialFormat: 'MP4',
    hasVideoFill: media.isVideo,
  };
}
