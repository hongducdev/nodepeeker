import { UIToPluginMessage } from '../types/messages';
import { extractNodeData } from './extractors';
import { uint8ArrayToString } from './color-utils';
import { clampFps } from '../utils/video-options';
import { resolveVideoFrame, extractRawGifBytes } from './video-frame';
import type { VideoScale, VideoQuality } from '../types/messages';
import { measureDistance, type DistanceMeasurement } from '../utils/distance';
import { bridgeService } from './bridge-service';

figma.showUI(__html__, {
  width: 340,
  height: 640,
  themeColors: true,
});
try {
  figma.root.setRelaunchData({ open: 'NodePeeker' });
} catch {
  // Ignore if root relaunch not supported
}

/** `figma.fileKey` is only populated for private plugins whose manifest enables
 *  `enablePrivatePluginApi`; guard the read so a public build degrades to a node ID. */
function readFileContext() {
  let fileKey: string | undefined;
  try {
    fileKey = typeof figma.fileKey === 'string' ? figma.fileKey : undefined;
  } catch {
    fileKey = undefined;
  }
  return { payload: { fileKey, fileName: figma.root.name || 'Untitled' } };
}

let selectionSequence = 0;

/** Gap between two layers, or `undefined` when either has no absolute bounds (Figma returns
 *  null for some node kinds, and a measurement needs both). */
function measureSelection(a: SceneNode, b: SceneNode): DistanceMeasurement | undefined {
  const boundsA = a.absoluteBoundingBox;
  const boundsB = b.absoluteBoundingBox;
  if (!boundsA || !boundsB) return undefined;

  return measureDistance(
    { name: a.name, bounds: boundsA },
    { name: b.name, bounds: boundsB }
  );
}

async function handleSelectionChange() {
  const seq = ++selectionSequence;
  const selection = figma.currentPage.selection;
  if (selection.length !== 1 && selection.length !== 2) {
    figma.ui.postMessage({
      type: 'SELECTION_CHANGE',
      payload: { kind: 'none', count: selection.length },
    });
    void bridgeService.pushSelection('none', selection.length);
    return;
  }

  if (selection.length === 2) {
    const measurement = measureSelection(selection[0], selection[1]);
    if (seq !== selectionSequence) return;
    figma.ui.postMessage({
      type: 'SELECTION_CHANGE',
      payload: measurement ? { kind: 'pair', measurement } : { kind: 'none', count: 2 },
    });
    void bridgeService.pushSelection('pair', 2);
    return;
  }

  const node = selection[0];
  try {
    const data = await extractNodeData(node);
    if (seq !== selectionSequence) return;
    figma.ui.postMessage({
      type: 'SELECTION_CHANGE',
      payload: { kind: 'single', data },
    });
    void bridgeService.pushSelection('single', 1, data);
  } catch {
    if (seq !== selectionSequence) return;
    const fallbackData = {
      id: node.id,
      name: node.name,
      type: node.type,
      css: {},
      colors: [],
      boxModel: {
        width: 'width' in node ? node.width : 0,
        height: 'height' in node ? node.height : 0,
        x: 'x' in node ? node.x : 0,
        y: 'y' in node ? node.y : 0,
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        gap: 0,
        cornerRadius: 0,
      },
    };
    figma.ui.postMessage({
      type: 'SELECTION_CHANGE',
      payload: {
        kind: 'single',
        data: fallbackData,
      },
    });
    void bridgeService.pushSelection('single', 1, fallbackData);
  }
}

figma.on('selectionchange', handleSelectionChange);

async function exportNodeAsVideo(
  node: SceneNode,
  options: {
    format: 'MP4' | 'GIF';
    fps: number;
    quality: VideoQuality;
    loopCount: number;
    scale: VideoScale;
  }
): Promise<Uint8Array> {
  const { format, fps, quality, loopCount, scale } = options;
  const nodeWidth = 'width' in node && typeof node.width === 'number' ? node.width : 0;
  const nodeHeight = 'height' in node && typeof node.height === 'number' ? node.height : 0;

  let constraint: { type: 'SCALE'; value: VideoScale } | { type: 'HEIGHT'; value: number } = {
    type: 'SCALE',
    value: scale,
  };
  if (nodeWidth > 0 && nodeHeight > 0 && (nodeWidth * scale > 1920 || nodeHeight * scale > 1080)) {
    const ratio = Math.min(1920 / (nodeWidth * scale), 1080 / (nodeHeight * scale));
    constraint = { type: 'HEIGHT', value: Math.max(1, Math.round(nodeHeight * scale * ratio)) };
  }

  // The plugin is strictly read-only: it must never create a wrapper node on the user's page,
  // because that would land in their document and undo history. A node Figma refuses to encode
  // therefore fails here, and the caller decides whether an enclosing frame is worth encoding.
  const bytes =
    format === 'GIF'
      ? await node.exportAsync({
          format: 'GIF',
          fps: clampFps('GIF', fps),
          loopCount,
          constraint,
        })
      : await node.exportAsync({
          format: 'MP4',
          fps: clampFps('MP4', fps),
          quality,
          constraint,
        });

  if (!bytes || bytes.length === 0) {
    throw new Error('Figma returned no video data for this layer.');
  }

  return bytes;
}

figma.ui.onmessage = async (msg: UIToPluginMessage) => {
  if (msg.type === 'INIT_REQUEST') {
    try {
      figma.ui.resize(340, 640);
    } catch {
      // resize optional
    }
    figma.ui.postMessage({ type: 'FILE_CONTEXT', ...readFileContext() });
    figma.ui.postMessage({ type: 'BRIDGE_STATUS', payload: bridgeService.getStatus() });
    await handleSelectionChange();
    return;
  }

  if (msg.type === 'SET_BRIDGE_TOKEN') {
    await bridgeService.setToken(msg.token);
    return;
  }

  if (msg.type === 'TOGGLE_BRIDGE') {
    await bridgeService.toggleEnabled(msg.enabled);
    return;
  }

  if (msg.type === 'REQUEST_EXPORT') {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({
        type: 'EXPORT_ERROR',
        error: 'No node selected for export',
      });
      return;
    }

    const node = selection[0];
    const safeName = (node.name || 'export').replace(/[/\\?%*:|"<>]/g, '-');

    try {
      if (msg.format === 'SVG') {
        const bytes = await node.exportAsync({ format: 'SVG' });
        const content = uint8ArrayToString(bytes);
        figma.ui.postMessage({
          type: 'EXPORT_RESULT',
          payload: {
            format: 'SVG',
            content,
            name: safeName,
            nodeId: node.id,
            action: msg.action,
          },
        });
      } else if (msg.format === 'PNG') {
        const scale = msg.scale || 2;
        const bytes = await node.exportAsync({
          format: 'PNG',
          constraint: { type: 'SCALE', value: scale },
        });
        figma.ui.postMessage({
          type: 'EXPORT_RESULT',
          payload: {
            format: 'PNG',
            bytes,
            name: safeName,
            action: 'download',
          },
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed';
      figma.ui.postMessage({
        type: 'EXPORT_ERROR',
        error: message,
      });
    }
  }
  if (msg.type === 'REQUEST_VIDEO_EXPORT') {
    const selectedNode = figma.currentPage.selection[0];
    if (!selectedNode) {
      figma.ui.postMessage({
        type: 'EXPORT_ERROR',
        error: 'No layer selected for export',
      });
      return;
    }

    const { format, quality, loopCount, scale } = msg.options;
    const safeName = (selectedNode.name || 'animation').replace(/[/\\?%*:|"<>]/g, '-');
    // 1. Direct GIF asset extraction: if user selected a GIF layer and wants GIF format,
    // export the original GIF bytes directly without re-encoding through Figma's video pipeline.
    if (format === 'GIF') {
      const rawGif = await extractRawGifBytes(selectedNode);
      if (rawGif) {
        figma.ui.postMessage({
          type: 'VIDEO_EXPORT_RESULT',
          payload: { format: 'GIF', bytes: rawGif, name: safeName },
        });
        return;
      }
    }

    // 2. Resolve encodable frame: must be placed directly on a page or inside a page-level frame
    const frame = resolveVideoFrame(selectedNode);
    if (!frame) {
      figma.ui.postMessage({
        type: 'EXPORT_ERROR',
        error: 'Video export needs a frame placed directly on the page. Nothing to encode here.',
      });
      return;
    }

    // 3. If a specific child layer was selected inside the frame (e.g. a video player or animation),
    // encode ONLY that selected layer instead of encoding the entire parent page/landing design.
    if (selectedNode.id !== frame.id) {
      try {
        const bytes = await exportNodeAsVideo(selectedNode, {
          format,
          fps: msg.options.fps,
          quality,
          loopCount,
          scale,
        });

        figma.ui.postMessage({
          type: 'VIDEO_EXPORT_RESULT',
          payload: { format, bytes, name: safeName },
        });
        return;
      } catch {
        // Fall through to frame export if isolated node export is rejected
      }
    }

    // 4. Encode the frame (the selection itself when it already is the page-level frame).
    // The file is named after the frame here, not the selection, because the frame is what
    // the bytes actually contain -- the name is the only record of which path ran.
    const frameSafeName = (frame.name || 'animation').replace(/[/\\?%*:|"<>]/g, '-');

    try {
      const bytes = await exportNodeAsVideo(frame, {
        format,
        fps: msg.options.fps,
        quality,
        loopCount,
        scale,
      });

      figma.ui.postMessage({
        type: 'VIDEO_EXPORT_RESULT',
        payload: { format, bytes, name: frameSafeName },
      });
    } catch (err: unknown) {
      if (format === 'GIF') {
        const fallbackGif = await extractRawGifBytes(selectedNode);
        if (fallbackGif) {
          figma.ui.postMessage({
            type: 'VIDEO_EXPORT_RESULT',
            payload: { format: 'GIF', bytes: fallbackGif, name: safeName },
          });
          return;
        }
      }

      const detail = err instanceof Error ? err.message : String(err);
      figma.ui.postMessage({
        type: 'EXPORT_ERROR',
        error: `Could not encode “${frame.name}”: ${detail}`,
      });
    }
    return;
  }
};

handleSelectionChange();
void bridgeService.boot();
