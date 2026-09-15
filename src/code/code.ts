import { UIToPluginMessage } from '../types/messages';
import { extractNodeData } from './extractors';
import { uint8ArrayToString } from './color-utils';
import { clampFps } from '../utils/video-options';
import { resolveVideoFrame } from './video-frame';

figma.showUI(__html__, {
  width: 340,
  height: 580,
  themeColors: true,
  title: 'NodePeeker',
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

async function handleSelectionChange() {
  const seq = ++selectionSequence;
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) {
    figma.ui.postMessage({
      type: 'SELECTION_CHANGE',
      payload: { selected: false, count: selection.length },
    });
    return;
  }

  const node = selection[0];
  try {
    const data = await extractNodeData(node);
    if (seq !== selectionSequence) return;
    figma.ui.postMessage({
      type: 'SELECTION_CHANGE',
      payload: { selected: true, data },
    });
  } catch {
    if (seq !== selectionSequence) return;
    figma.ui.postMessage({
      type: 'SELECTION_CHANGE',
      payload: {
        selected: true,
        data: {
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
        },
      },
    });
  }
}

figma.on('selectionchange', handleSelectionChange);

figma.ui.onmessage = async (msg: UIToPluginMessage) => {
  if (msg.type === 'INIT_REQUEST') {
    figma.ui.postMessage({ type: 'FILE_CONTEXT', ...readFileContext() });
    await handleSelectionChange();
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
    // Re-resolve from the live selection rather than trusting anything the UI sent back.
    const frame = resolveVideoFrame(figma.currentPage.selection[0]);

    if (!frame) {
      figma.ui.postMessage({
        type: 'EXPORT_ERROR',
        error: 'Video export needs a frame placed directly on the page. Nothing to encode here.',
      });
      return;
    }

    const { format, quality, loopCount, scale } = msg.options;
    const constraint = { type: 'SCALE' as const, value: scale };
    const safeName = (frame.name || 'animation').replace(/[/\\?%*:|"<>]/g, '-');

    try {
      const bytes =
        format === 'GIF'
          ? await frame.exportAsync({
              format: 'GIF',
              fps: clampFps('GIF', msg.options.fps),
              loopCount,
              constraint,
            })
          : await frame.exportAsync({
              format: 'MP4',
              fps: clampFps('MP4', msg.options.fps),
              quality,
              constraint,
            });

      figma.ui.postMessage({
        type: 'VIDEO_EXPORT_RESULT',
        payload: { format, bytes, name: safeName },
      });
    } catch (err: unknown) {
      // Figma rejects when the frame has nothing animated to encode; say so plainly rather
      // than surfacing a generic failure.
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
