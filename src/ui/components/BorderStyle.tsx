import React from 'react';
import { BorderData } from '../../types/messages';
import { Square, Copy, Check } from 'lucide-react';

interface BorderStyleProps {
  border?: BorderData;
  onCopy: (val: string, label: string) => void;
  copiedText: string | null;
}

export const BorderStyle: React.FC<BorderStyleProps> = ({ border, onCopy, copiedText }) => {
  if (!border) {
    return null;
  }

  const { strokeWeight, individualWeights, strokeStyle, strokeAlign, color } = border;

  const formatBorderCss = () => {
    if (individualWeights) {
      const parts: string[] = [];
      if (individualWeights.top > 0) parts.push(`border-top: ${individualWeights.top}px ${strokeStyle} ${color};`);
      if (individualWeights.right > 0) parts.push(`border-right: ${individualWeights.right}px ${strokeStyle} ${color};`);
      if (individualWeights.bottom > 0) parts.push(`border-bottom: ${individualWeights.bottom}px ${strokeStyle} ${color};`);
      if (individualWeights.left > 0) parts.push(`border-left: ${individualWeights.left}px ${strokeStyle} ${color};`);
      return parts.join('\n');
    }
    return `border: ${strokeWeight}px ${strokeStyle} ${color};`;
  };

  const formatBorderTailwind = () => {
    const classes: string[] = [];
    if (individualWeights) {
      if (individualWeights.top > 0) classes.push(individualWeights.top === 1 ? 'border-t' : `border-t-[${individualWeights.top}px]`);
      if (individualWeights.right > 0) classes.push(individualWeights.right === 1 ? 'border-r' : `border-r-[${individualWeights.right}px]`);
      if (individualWeights.bottom > 0) classes.push(individualWeights.bottom === 1 ? 'border-b' : `border-b-[${individualWeights.bottom}px]`);
      if (individualWeights.left > 0) classes.push(individualWeights.left === 1 ? 'border-l' : `border-l-[${individualWeights.left}px]`);
    } else {
      if (strokeWeight === 1) classes.push('border');
      else if ([2, 4, 8].includes(strokeWeight)) classes.push(`border-${strokeWeight}`);
      else classes.push(`border-[${strokeWeight}px]`);
    }

    if (strokeStyle === 'dashed') classes.push('border-dashed');
    if (strokeStyle === 'dotted') classes.push('border-dotted');
    classes.push(`border-[${color}]`);

    return classes.join(' ');
  };

  const cssDeclaration = formatBorderCss();
  const tailwindDeclaration = formatBorderTailwind();

  const isCssCopied = copiedText === cssDeclaration;
  const isTailwindCopied = copiedText === tailwindDeclaration;

  const getBorderWidthLabel = () => {
    if (individualWeights) {
      const { top: t, right: r, bottom: b, left: l } = individualWeights;
      return `T:${t} R:${r} B:${b} L:${l}px`;
    }
    return `${strokeWeight}px`;
  };

  return (
    <div className="p-3 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <Square size={12} className="text-amber-500" />
          <span>Border & Stroke Style</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
            {getBorderWidthLabel()}
          </span>
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            {strokeStyle}
          </span>
          {strokeAlign && (
            <span className="text-[10px] font-mono lowercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
              {strokeAlign}
            </span>
          )}
        </div>
      </div>

      {/* Visual Live Border Preview */}
      <div
        className="w-full py-1.5 px-3 mb-2 rounded bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs font-mono transition"
        style={{
          borderTopWidth: individualWeights ? `${individualWeights.top}px` : `${strokeWeight}px`,
          borderRightWidth: individualWeights ? `${individualWeights.right}px` : `${strokeWeight}px`,
          borderBottomWidth: individualWeights ? `${individualWeights.bottom}px` : `${strokeWeight}px`,
          borderLeftWidth: individualWeights ? `${individualWeights.left}px` : `${strokeWeight}px`,
          borderStyle: strokeStyle,
          borderColor: color,
        }}
      >
        <span className="text-[11px] text-slate-700 dark:text-slate-200 font-semibold truncate">
          {cssDeclaration.replace(/\n/g, ' ')}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <div
            className="w-2.5 h-2.5 rounded-full border border-slate-400 shrink-0"
            style={{ backgroundColor: color }}
          />
        </div>
      </div>

      {/* Quick copy chips */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={() => onCopy(cssDeclaration, 'Border CSS')}
          className="flex items-center justify-between px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-medium transition group"
          title="Copy border CSS property"
        >
          <span className="truncate">CSS Border</span>
          {isCssCopied ? (
            <Check size={11} className="text-emerald-500 shrink-0 ml-1" />
          ) : (
            <Copy size={11} className="opacity-40 group-hover:opacity-100 shrink-0 ml-1" />
          )}
        </button>

        <button
          onClick={() => onCopy(tailwindDeclaration, 'Border Tailwind')}
          className="flex items-center justify-between px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-medium transition group"
          title="Copy border Tailwind classes"
        >
          <span className="truncate">Tailwind Border</span>
          {isTailwindCopied ? (
            <Check size={11} className="text-emerald-500 shrink-0 ml-1" />
          ) : (
            <Copy size={11} className="opacity-40 group-hover:opacity-100 shrink-0 ml-1" />
          )}
        </button>
      </div>
    </div>
  );
};
