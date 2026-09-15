import React, { useEffect, useState, useCallback } from 'react';
import { PluginToUIMessage, SelectionState, UIToPluginMessage } from '../types/messages';
import { Header } from './components/Header';
import { BoxModel } from './components/BoxModel';
import { ColorPalette } from './components/ColorPalette';
import { BorderStyle } from './components/BorderStyle';
import { CodeViewer } from './components/CodeViewer';
import { QuickExport } from './components/QuickExport';
import { EmptyState } from './components/EmptyState';
import { Toast } from './components/Toast';
import { useClipboard } from './hooks/useClipboard';
import { useFigmaTheme } from './hooks/useFigmaTheme';

export const App: React.FC = () => {
  useFigmaTheme();
  const [selection, setSelection] = useState<SelectionState>({ selected: false, count: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const { copy, copiedText, copiedLabel } = useClipboard();

  const handleExport = useCallback((msg: UIToPluginMessage) => {
    setIsExporting(true);
    parent.postMessage({ pluginMessage: msg }, '*');
  }, []);

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

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as PluginToUIMessage | undefined;
      if (!msg) return;

      if (msg.type === 'SELECTION_CHANGE') {
        setSelection(msg.payload);
      } else if (msg.type === 'EXPORT_RESULT') {
        setIsExporting(false);
        const { payload } = msg;

        if (payload.format === 'SVG') {
          if (payload.action === 'copy') {
            copy(payload.content, 'SVG Markup');
          } else {
            const blob = new Blob([payload.content], { type: 'image/svg+xml;charset=utf-8' });
            downloadBlob(blob, `${payload.name || 'icon'}.svg`);
          }
        } else if (payload.format === 'PNG') {
          const uint8 = new Uint8Array(payload.bytes);
          const blob = new Blob([uint8], { type: 'image/png' });
          downloadBlob(blob, `${payload.name || 'image'}@2x.png`);
        }
      } else if (msg.type === 'EXPORT_ERROR') {
        setIsExporting(false);
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
      {!selection.selected ? (
        <EmptyState count={selection.count} />
      ) : (
        <>
          <Header data={selection.data} />
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
              onCopy={copy}
              copiedText={copiedText}
            />
            <QuickExport
              onExport={handleExport}
              isExporting={isExporting}
              svgContent={selection.data.svg}
              onCopy={copy}
            />
          </div>
        </>
      )}

      <Toast message={copiedLabel ? `Copied ${copiedLabel}!` : null} />
    </div>
  );
};
