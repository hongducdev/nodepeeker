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
        return <LayoutGrid size={14} className="text-blue shrink-0" />;
      case 'TEXT':
        return <Type size={14} className="text-green shrink-0" />;
      case 'COMPONENT':
      case 'INSTANCE':
        return <Component size={14} className="text-mauve shrink-0" />;
      case 'VECTOR':
      case 'LINE':
      case 'ELLIPSE':
      case 'POLYGON':
      case 'STAR':
        return <Shapes size={14} className="text-peach shrink-0" />;
      default:
        return <Layers size={14} className="text-overlay1 shrink-0" />;
    }
  };

  return (
    <header className="px-3 py-2.5 border-b border-surface0 bg-base/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {renderIcon()}
          <h1
            className="text-xs font-semibold text-text truncate"
            title={name}
          >
            {name || 'Unnamed Layer'}
          </h1>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface0 text-overlay1 font-medium shrink-0">
            {type}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 font-mono text-[11px] text-subtext0 bg-surface0/80 px-2 py-0.5 rounded">
            <span>{boxModel.width}</span>
            <span className="text-overlay0">×</span>
            <span>{boxModel.height}</span>
          </div>

          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className={`p-1 rounded text-overlay0 hover:text-text hover:bg-surface0 transition ${
              showShortcuts ? 'text-blue bg-blue/15' : ''
            }`}
            title="Keyboard Shortcuts"
          >
            <Keyboard size={13} />
          </button>
        </div>
      </div>

      {showShortcuts && (
        <div className="mt-2.5 p-2.5 rounded-lg border border-surface1 bg-surface0 text-xs shadow-lg animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between font-semibold text-text mb-2">
            <span>Keyboard Shortcuts</span>
            <button
              onClick={() => setShowShortcuts(false)}
              className="text-overlay0 hover:text-text"
            >
              <X size={13} />
            </button>
          </div>
          <div className="space-y-1.5 text-[11px] text-subtext0">
            <div className="flex items-center justify-between">
              <span>Re-open Plugin in Figma</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface1 border border-surface2 font-medium">
                Ctrl+Alt+P / ⌥⌘P
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Figma Plugins Panel</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface1 border border-surface2 font-medium">
                Shift+I
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Switch to CSS tab</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface1 border border-surface2 font-medium">
                1 or C
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Switch to Tailwind tab</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface1 border border-surface2 font-medium">
                2 or T
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Copy active code</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface1 border border-surface2 font-medium">
                Ctrl+C / ⌘C
              </kbd>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
