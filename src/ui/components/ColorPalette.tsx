import React, { useState } from 'react';
import { ColorToken } from '../../types/messages';
import { Palette, Copy, Check } from 'lucide-react';
import { toHex8 } from '../../utils/color';

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
        return c.opacity < 1 ? toHex8(c.hex, c.opacity) : c.hex;
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
    <div className="p-3 border-b border-surface0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-[11px] font-medium text-overlay1">
          <Palette size={12} />
          <span>Colors & Swatches ({colors.length})</span>
        </div>

        {/* Format switchers */}
        <div className="flex items-center rounded bg-surface0 p-0.5 text-[10px] font-mono">
          {(['HEX', 'RGB', 'HSL'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className={`px-1.5 py-0.5 rounded transition ${
                format === fmt
                  ? 'bg-surface2 text-text font-semibold shadow-xs'
                  : 'text-overlay1 hover:text-text'
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
              className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-surface0/60 transition cursor-pointer group"
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Swatch circle with checkering for alpha */}
                <div className="relative w-4 h-4 rounded-full border border-surface2 shrink-0 overflow-hidden shadow-xs">
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: c.rgba }}
                  />
                </div>

                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-xs font-mono font-medium text-text truncate">
                    {val}
                  </span>
                  {c.opacity < 1 && (
                    <span className="text-[10px] font-mono text-overlay0">
                      {Math.round(c.opacity * 100)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] uppercase tracking-wide font-mono px-1 py-0.2 rounded bg-surface0 text-overlay0">
                  {c.name || c.source}
                </span>

                <div className="text-overlay0 group-hover:text-text transition">
                  {isCopied ? (
                    <Check size={12} className="text-green" />
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
