import React from 'react';
import { MousePointerClick, Layers } from 'lucide-react';

interface EmptyStateProps {
  count?: number;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ count = 0 }) => {
  if (count > 1) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center h-[420px]">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-500 dark:text-slate-400">
          <Layers size={22} />
        </div>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
          {count} Layers Selected
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[220px] leading-relaxed">
          Please select a single layer on the canvas for detailed code inspection and export.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center h-[420px]">
      <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center mb-3 text-blue-600 dark:text-blue-400 animate-pulse">
        <MousePointerClick size={22} />
      </div>

      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
        Select a layer to inspect
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[220px] leading-relaxed mb-6">
        Click any frame, component, or text on the canvas to inspect code, colors, and layout.
      </p>

      <div className="w-full max-w-[240px] space-y-2 text-left text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          <span>Tailwind CSS & pure CSS</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Interactive box model & gaps</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <span>1-click HEX/RGB/HSL color copier</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
          <span>Instant SVG code & 2x PNG export</span>
        </div>
      </div>

      <div className="w-full max-w-[240px] mt-3 p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-[10px] text-blue-700 dark:text-blue-300 flex items-center justify-between">
        <span>Quick open in Figma:</span>
        <kbd className="font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 text-slate-800 dark:text-slate-200">
          Ctrl+Alt+P / ⌥⌘P
        </kbd>
      </div>
    </div>
  );
};
