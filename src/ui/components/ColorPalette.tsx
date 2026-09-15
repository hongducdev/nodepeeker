import React, { useState } from 'react';
import { ColorToken } from '../../types/messages';
import { Palette, Copy, Check } from 'lucide-react';

interface ColorPaletteProps {
  colors: ColorToken[];
  onCopy: (val: string, label: string) => void;
  copiedText: string | null;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({ colors, onCopy, copiedText }) => {
  const [format, setFormat] = useState<'HEX' | 'RGB' | 'HSL'>('HEX');

  const getFormattedValue = (c: ColorToken) => {
    switch (format) {
      case 'HEX':
        return c.hex;
      case 'RGB':
        return c.rgba;
      case 'HSL':
        return c.hsl;
    }
  };

  if (colors.length === 0) {
    return null;
  }

  return (
    <div className="p-3 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <Palette size={12} />
          <span>Colors & Swatches ({colors.length})</span>
        </div>

        {/* Format switchers */}
        <div className="flex items-center rounded bg-slate-100 dark:bg-slate-800 p-0.5 text-[10px] font-mono">
          {(['HEX', 'RGB', 'HSL'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className={`px-1.5 py-0.5 rounded transition ${
                format === fmt
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {colors.map((c, index) => {
          const val = getFormattedValue(c);
          const isCopied = copiedText === val;

          return (
            <div
              key={`${c.hex}-${c.source}-${index}`}
              onClick={() => onCopy(val, val)}
              className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer group"
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Swatch circle with checkering for alpha */}
                <div className="relative w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0 overflow-hidden shadow-xs">
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: c.rgba }}
                  />
                </div>

                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200 truncate">
                    {val}
                  </span>
                  {c.opacity < 1 && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {Math.round(c.opacity * 100)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] uppercase tracking-wide font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                  {c.name || c.source}
                </span>

                <div className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition">
                  {isCopied ? (
                    <Check size={12} className="text-emerald-500" />
                  ) : (
                    <Copy size={12} className="opacity-0 group-hover:opacity-100 transition" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
