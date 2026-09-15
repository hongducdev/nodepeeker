import React, { useState, useEffect } from 'react';
import { NodeInspectionData } from '../../types/messages';
import { transpileToTailwind } from '../../utils/tailwind-transpiler';
import { Code2, Copy, Check } from 'lucide-react';
import { CodeHighlighter } from './CodeHighlighter';

interface CodeViewerProps {
  data: NodeInspectionData;
  onCopy: (val: string, label: string) => void;
  copiedText: string | null;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ data, onCopy, copiedText }) => {
  // Default to CSS per user request
  const [tab, setTab] = useState<'css' | 'tailwind'>('css');

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

  const cssCode = formatCss();
  const activeCode = tab === 'css' ? cssCode : tailwindCode;
  const isCopied = copiedText === activeCode;

  // Keyboard shortcuts: 1/C for CSS, 2/T for Tailwind, Ctrl/Cmd+C or Alt+C for Copy
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === '1' || (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey)) {
        setTab('css');
      } else if (e.key === '2' || (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey && !e.altKey)) {
        setTab('tailwind');
      } else if ((e.ctrlKey || e.metaKey || e.altKey) && e.key.toLowerCase() === 'c') {
        onCopy(activeCode, tab === 'css' ? 'CSS styles' : 'Tailwind classes');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCode, tab, onCopy]);

  return (
    <div className="p-3 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Code2 size={12} className="text-slate-500 dark:text-slate-400" />
          <div className="flex rounded bg-slate-100 dark:bg-slate-800 p-0.5 text-[11px] font-medium">
            <button
              onClick={() => setTab('css')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition ${
                tab === 'css'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Shortcut: Press '1' or 'C'"
            >
              <span>CSS</span>
              <kbd className="text-[9px] font-mono opacity-50 px-1 py-0.2 rounded bg-slate-200/60 dark:bg-slate-800/80">1</kbd>
            </button>
            <button
              onClick={() => setTab('tailwind')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition ${
                tab === 'tailwind'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Shortcut: Press '2' or 'T'"
            >
              <span>Tailwind</span>
              <kbd className="text-[9px] font-mono opacity-50 px-1 py-0.2 rounded bg-slate-200/60 dark:bg-slate-800/80">2</kbd>
            </button>
          </div>
        </div>

        <button
          onClick={() => onCopy(activeCode, tab === 'css' ? 'CSS styles' : 'Tailwind classes')}
          className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
          title="Copy to clipboard (Ctrl+C / Cmd+C)"
        >
          {isCopied ? (
            <>
              <Check size={12} className="text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="relative rounded-md bg-slate-900 text-slate-100 p-2.5 overflow-x-auto max-h-56 scrollbar-thin border border-slate-800">
        <CodeHighlighter code={activeCode} language={tab} />
      </div>
    </div>
  );
};
