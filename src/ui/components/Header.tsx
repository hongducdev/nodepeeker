import React, { useState } from 'react';
import { LayoutGrid, Type, Component, Shapes, Layers, Keyboard, X } from 'lucide-react';
import { NodeInspectionData } from '../../types/messages';

interface HeaderProps {
  data: NodeInspectionData;
}

export const Header: React.FC<HeaderProps> = ({ data }) => {
  const { name, type, boxModel } = data;
  const [showShortcuts, setShowShortcuts] = useState(false);

  const renderIcon = () => {
    switch (type) {
      case 'FRAME':
      case 'SECTION':
      case 'GROUP':
        return <LayoutGrid size={14} className="text-blue-500 shrink-0" />;
      case 'TEXT':
        return <Type size={14} className="text-emerald-500 shrink-0" />;
      case 'COMPONENT':
      case 'INSTANCE':
        return <Component size={14} className="text-purple-500 shrink-0" />;
      case 'VECTOR':
      case 'LINE':
      case 'ELLIPSE':
      case 'POLYGON':
      case 'STAR':
        return <Shapes size={14} className="text-amber-500 shrink-0" />;
      default:
        return <Layers size={14} className="text-slate-400 shrink-0" />;
    }
  };

  return (
    <header className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {renderIcon()}
          <h1
            className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate"
            title={name}
          >
            {name || 'Unnamed Layer'}
          </h1>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium shrink-0">
            {type}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded">
            <span>{boxModel.width}</span>
            <span className="text-slate-400">×</span>
            <span>{boxModel.height}</span>
          </div>

          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className={`p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
              showShortcuts ? 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' : ''
            }`}
            title="Keyboard Shortcuts"
          >
            <Keyboard size={13} />
          </button>
        </div>
      </div>

      {showShortcuts && (
        <div className="mt-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs shadow-lg animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200 mb-2">
            <span>Keyboard Shortcuts</span>
            <button
              onClick={() => setShowShortcuts(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={13} />
            </button>
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between">
              <span>Re-open Plugin in Figma</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-medium">
                Ctrl+Alt+P / ⌥⌘P
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Figma Plugins Panel</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-medium">
                Shift+I
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Switch to CSS tab</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-medium">
                1 or C
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Switch to Tailwind tab</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-medium">
                2 or T
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Copy active code</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-medium">
                Ctrl+C / ⌘C
              </kbd>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
