import React, { useEffect, useState, useCallback, useRef } from 'react';
import type {
  FileContext,
  PluginToUIMessage,
  SelectionState,
  UIToPluginMessage,
  VideoExportOptions,
} from '../types/messages';
import { Header } from './components/Header';
import { NodeLink } from './components/NodeLink';
import { BoxModel } from './components/BoxModel';
import { ColorPalette } from './components/ColorPalette';
import { BorderStyle } from './components/BorderStyle';
import { CodeViewer } from './components/CodeViewer';
import { QuickExport } from './components/QuickExport';
import { VideoExport } from './components/VideoExport';
import { EmptyState } from './components/EmptyState';
import { DistancePanel } from './components/DistancePanel';
import { Toast } from './components/Toast';
import { useClipboard } from './hooks/useClipboard';
import { useFigmaTheme } from './hooks/useFigmaTheme';
import { videoExtension, videoMime } from '../utils/video-options';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Binary payloads arrive as a plain `Uint8Array`, which TS types over `ArrayBufferLike`
 *  while `BlobPart` wants an `ArrayBuffer` view. Figma never returns a SharedArrayBuffer. */
const downloadBytes = (bytes: Uint8Array, type: string, filename: string) => {
  // A regression to `number[]` would otherwise be stringified into a corrupt file that still
  // has the right name, extension and MIME -- fail loudly instead.
  if (!(bytes instanceof Uint8Array)) {
    alert(`Export failed: expected binary data but received ${typeof bytes}.`);
    return;
  }
  downloadBlob(new Blob([bytes as BlobPart], { type }), filename);
};

export const App: React.FC = () => {
  useFigmaTheme();
  const [selection, setSelection] = useState<SelectionState>({ kind: 'none', count: 0 });
  const [fileContext, setFileContext] = useState<FileContext>({ fileName: '' });
  const [isExporting, setIsExporting] = useState(false);
  // Kept apart from isExporting: a video encode runs for seconds, and a selection change
  // mid-encode (which fires an unrelated EXPORT_RESULT for the SVG view request) would
  // otherwise re-enable the button and allow a second concurrent encode.
  const [isVideoExporting, setIsVideoExporting] = useState(false);
  const { copy, copiedText, copiedLabel } = useClipboard();

  // SVG markup is large and most visits never open the SVG tab, so it is fetched on
  // demand and cached for the one node it belongs to.
  const [svgCache, setSvgCache] = useState<{ nodeId: string; content: string } | null>(null);
  const [isSvgLoading, setIsSvgLoading] = useState(false);
  const currentNodeIdRef = useRef<string | null>(null);
  const svgRequestedForRef = useRef<string | null>(null);

  const selectedNodeId = selection.kind === 'single' ? selection.data.id : null;
  const svgContent = svgCache && svgCache.nodeId === selectedNodeId ? svgCache.content : undefined;

  const handleExport = useCallback((msg: UIToPluginMessage) => {
    setIsExporting(true);
    parent.postMessage({ pluginMessage: msg }, '*');
  }, []);

  const handleVideoExport = useCallback((options: VideoExportOptions) => {
    setIsVideoExporting(true);
    parent.postMessage(
      { pluginMessage: { type: 'REQUEST_VIDEO_EXPORT', options } satisfies UIToPluginMessage },
      '*'
    );
  }, []);

  // Stable identity on purpose: CodeViewer drives this from an effect, so a changing
  // callback would re-trigger the request on every render.
  const handleRequestSvg = useCallback(() => {
    const nodeId = currentNodeIdRef.current;
    if (!nodeId || svgRequestedForRef.current === nodeId) return;

    svgRequestedForRef.current = nodeId;
    setIsSvgLoading(true);
    parent.postMessage(
      { pluginMessage: { type: 'REQUEST_EXPORT', format: 'SVG', action: 'view' } satisfies UIToPluginMessage },
      '*'
    );
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as PluginToUIMessage | undefined;
      if (!msg) return;

      if (msg.type === 'FILE_CONTEXT') {
        setFileContext(msg.payload);
        return;
      }

      if (msg.type === 'SELECTION_CHANGE') {
        setSelection(msg.payload);
        const nextNodeId = msg.payload.kind === 'single' ? msg.payload.data.id : null;
        // Leaving a node invalidates its request marker, so returning to it refetches
        // (and a fetch that failed once gets a retry on the next visit).
        if (nextNodeId !== currentNodeIdRef.current) {
          svgRequestedForRef.current = null;
        }
        currentNodeIdRef.current = nextNodeId;
        setIsSvgLoading(false);
        return;
      }

      if (msg.type === 'EXPORT_RESULT') {
        setIsExporting(false);
        const { payload } = msg;

        if (payload.format === 'SVG') {
          if (payload.action === 'view') {
            // Reject a response for a node the user has already navigated away from.
            if (payload.nodeId === currentNodeIdRef.current) {
              setSvgCache({ nodeId: payload.nodeId, content: payload.content });
            }
            setIsSvgLoading(false);
          } else if (payload.action === 'copy') {
            copy(payload.content, 'SVG Markup');
          } else {
            const blob = new Blob([payload.content], { type: 'image/svg+xml;charset=utf-8' });
            downloadBlob(blob, `${payload.name || 'icon'}.svg`);
          }
        } else if (payload.format === 'PNG') {
          downloadBytes(payload.bytes, 'image/png', `${payload.name || 'image'}@2x.png`);
        }
        return;
      }

      if (msg.type === 'VIDEO_EXPORT_RESULT') {
        setIsVideoExporting(false);
        const { format, bytes, name } = msg.payload;
        downloadBytes(
          bytes,
          videoMime(format),
          `${name || 'animation'}.${videoExtension(format)}`
        );
        return;
      }

      if (msg.type === 'EXPORT_ERROR') {
        setIsExporting(false);
        setIsVideoExporting(false);
        setIsSvgLoading(false);
        // The marker is deliberately left armed. Clearing it here would let the
        // CodeViewer fetch effect -- which re-runs on the isSvgLoading change --
        // immediately re-request the same export, looping without bound.
        alert(`Export failed: ${msg.error}`);
      }
    };

    window.addEventListener('message', onMessage);
    parent.postMessage({ pluginMessage: { type: 'INIT_REQUEST' } }, '*');

    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, [copy]);

  return (
    <div className="flex flex-col h-screen w-full bg-base text-text select-none overflow-hidden font-sans">
      {selection.kind === 'none' ? (
        <EmptyState count={selection.count} />
      ) : selection.kind === 'pair' ? (
        <DistancePanel measurement={selection.measurement} onCopy={copy} />
      ) : (
        <>
          <Header data={selection.data} />
          <NodeLink
            nodeId={selection.data.id}
            fileKey={fileContext.fileKey}
            fileName={fileContext.fileName}
            onCopy={copy}
            copiedText={copiedText}
          />
          <div className="flex-1 overflow-y-auto divide-y divide-surface0 scrollbar-thin">
            <BoxModel
              boxModel={selection.data.boxModel}
              border={selection.data.border}
              layoutMode={selection.data.layoutMode}
              onCopy={copy}
            />
            <ColorPalette
              colors={selection.data.colors}
              onCopy={copy}
              copiedText={copiedText}
            />
            <BorderStyle
              border={selection.data.border}
              onCopy={copy}
              copiedText={copiedText}
            />
            <CodeViewer
              data={selection.data}
              svg={svgContent}
              isSvgLoading={isSvgLoading}
              onRequestSvg={handleRequestSvg}
              onCopy={copy}
              copiedText={copiedText}
            />
            <QuickExport
              onExport={handleExport}
              isExporting={isExporting}
              svgContent={svgContent}
              onCopy={copy}
            />
            {selection.data.video && (
              <VideoExport
                video={selection.data.video}
                onExport={handleVideoExport}
                isExporting={isVideoExporting}
              />
            )}
          </div>
        </>
      )}

      <Toast message={copiedLabel ? `Copied ${copiedLabel}!` : null} />
    </div>
  );
};
