import React, { useState, useEffect } from 'react';
import { NodeInspectionData } from '../../types/messages';
import { transpileToTailwind } from '../../utils/tailwind-transpiler';
import { Code2, Copy, Check } from 'lucide-react';
import { CodeHighlighter } from './CodeHighlighter';

interface CodeViewerProps {
  data: NodeInspectionData;
  /** Lazily fetched SVG markup for the current node, once requested. */
  svg?: string;
  isSvgLoading?: boolean;
  onRequestSvg?: () => void;
  onCopy: (val: string, label: string) => void;
  copiedText: string | null;
}

type CodeTab = 'css' | 'tailwind' | 'svg';

const TAB_ORDER: readonly CodeTab[] = ['css', 'tailwind', 'svg'];

const TAB_META: Record<CodeTab, { label: string; digit: string; letter: string; copyLabel: string }> = {
  css: { label: 'CSS', digit: '1', letter: 'c', copyLabel: 'CSS styles' },
  tailwind: { label: 'Tailwind', digit: '2', letter: 't', copyLabel: 'Tailwind classes' },
  svg: { label: 'SVG', digit: '3', letter: 's', copyLabel: 'SVG markup' },
};

export const CodeViewer: React.FC<CodeViewerProps> = ({
  data,
  svg,
  isSvgLoading,
  onRequestSvg,
  onCopy,
  copiedText,
}) => {
  // Default to CSS per user request
  const [tab, setTab] = useState<CodeTab>('css');

  const tailwindCode = transpileToTailwind(data);

  const formatCss = () => {
    const cssMap: Record<string, string> = { ...data.css };
    if (data.border && !cssMap['border'] && !cssMap['border-top']) {
      const { strokeWeight, individualWeights, strokeStyle, color } = data.border;
      if (individualWeights) {
        if (individualWeights.top > 0) cssMap['border-top'] = `${individualWeights.top}px ${strokeStyle} ${color}`;
        if (individualWeights.right > 0) cssMap['border-right'] = `${individualWeights.right}px ${strokeStyle} ${color}`;
        if (individualWeights.bottom > 0) cssMap['border-bottom'] = `${individualWeights.bottom}px ${strokeStyle} ${color}`;
        if (individualWeights.left > 0) cssMap['border-left'] = `${individualWeights.left}px ${strokeStyle} ${color}`;
      } else if (strokeWeight > 0) {
        cssMap['border'] = `${strokeWeight}px ${strokeStyle} ${color}`;
      }
    }
    const entries = Object.entries(cssMap);
    if (entries.length === 0) {
      return `/* Dimensions */\nwidth: ${data.boxModel.width}px;\nheight: ${data.boxModel.height}px;`;
    }
    return entries.map(([prop, val]) => `${prop}: ${val};`).join('\n');
  };

  const codeByTab: Record<CodeTab, string> = {
    css: formatCss(),
    tailwind: tailwindCode,
    svg: svg ?? '',
  };
  const activeCode = codeByTab[tab];
  const isCopied = copiedText === activeCode;

  // Fetch the markup the first time the SVG tab is shown, and again when the node changes.
  useEffect(() => {
    if (tab === 'svg' && !svg && !isSvgLoading) {
      onRequestSvg?.();
    }
  }, [tab, svg, isSvgLoading, onRequestSvg]);

  // Keyboard shortcuts: 1/C CSS, 2/T Tailwind, 3/S SVG, Ctrl/Cmd+C copy active code.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();
      const isPlain = !e.ctrlKey && !e.metaKey && !e.altKey;
      if (isPlain) {
        const next = TAB_ORDER.find(
          (id) => TAB_META[id].digit === e.key || TAB_META[id].letter === key
        );
        if (next) {
          setTab(next);
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey || e.altKey) && key === 'c') {
        // Mirror the Copy button's disabled state: never copy an empty tab
        // (e.g. a node whose SVG export failed), which would clear the
        // clipboard and report a copy that did not happen.
        if (activeCode) {
          onCopy(activeCode, TAB_META[tab].copyLabel);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCode, tab, onCopy]);

  return (
    <div className="p-3 border-b border-surface0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Code2 size={12} className="text-overlay1" />
          <div className="flex rounded bg-surface0 p-0.5 text-[11px] font-medium">
            {TAB_ORDER.map((id) => {
              const meta = TAB_META[id];
              const isActive = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded transition ${
                    isActive
                      ? 'bg-surface2 text-blue font-semibold shadow-xs'
                      : 'text-overlay1 hover:text-text'
                  }`}
                  title={`Shortcut: Press '${meta.digit}' or '${meta.letter.toUpperCase()}'`}
                >
                  <span>{meta.label}</span>
                  <kbd className="text-[9px] font-mono opacity-50 px-1 py-0.2 rounded bg-surface1/60">
                    {meta.digit}
                  </kbd>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => onCopy(activeCode, TAB_META[tab].copyLabel)}
          disabled={!activeCode}
          className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-surface0 hover:bg-surface1 text-subtext1 transition disabled:opacity-40 disabled:cursor-not-allowed"
          title="Copy to clipboard (Ctrl+C / Cmd+C)"
        >
          {isCopied ? (
            <>
              <Check size={12} className="text-green" />
              <span className="text-green">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="relative rounded-md bg-crust text-text p-2.5 overflow-x-auto max-h-56 scrollbar-thin border border-surface0">
        {tab === 'svg' && isSvgLoading && !svg ? (
          <span className="text-overlay1 italic">Loading SVG…</span>
        ) : (
          <CodeHighlighter code={activeCode} language={tab} />
        )}
      </div>
    </div>
  );
};
