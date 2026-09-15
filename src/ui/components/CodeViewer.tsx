import React, { useState } from 'react';
import { NodeInspectionData } from '../../types/messages';
import { transpileToTailwind } from '../../utils/tailwind-transpiler';
import { Code2, Copy, Check } from 'lucide-react';

interface CodeViewerProps {
  data: NodeInspectionData;
  onCopy: (val: string, label: string) => void;
  copiedText: string | null;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ data, onCopy, copiedText }) => {
  const [tab, setTab] = useState<'tailwind' | 'css'>('tailwind');

  const tailwindCode = transpileToTailwind(data);

  const formatCss = () => {
    const entries = Object.entries(data.css);
    if (entries.length === 0) {
      return `/* Dimensions */\nwidth: ${data.boxModel.width}px;\nheight: ${data.boxModel.height}px;`;
    }
    return entries.map(([prop, val]) => `${prop}: ${val};`).join('\n');
  };

  const cssCode = formatCss();
  const activeCode = tab === 'tailwind' ? tailwindCode : cssCode;
  const isCopied = copiedText === activeCode;

  return (
    <div className="p-3 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Code2 size={12} className="text-slate-500 dark:text-slate-400" />
          <div className="flex rounded bg-slate-100 dark:bg-slate-800 p-0.5 text-[11px] font-medium">
            <button
              onClick={() => setTab('tailwind')}
              className={`px-2 py-0.5 rounded transition ${
                tab === 'tailwind'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Tailwind
            </button>
            <button
              onClick={() => setTab('css')}
              className={`px-2 py-0.5 rounded transition ${
                tab === 'css'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              CSS
            </button>
          </div>
        </div>

        <button
          onClick={() => onCopy(activeCode, tab === 'tailwind' ? 'Tailwind classes' : 'CSS styles')}
          className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
          title="Copy to clipboard"
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

      <div className="relative rounded-md bg-slate-900 text-slate-100 p-2.5 font-mono text-xs overflow-x-auto max-h-48 scrollbar-thin border border-slate-800">
        <pre className="whitespace-pre-wrap break-words leading-relaxed select-all">
          {activeCode || '/* No styles extracted */'}
        </pre>
      </div>
    </div>
  );
};
