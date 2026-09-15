import React from 'react';
import { BoxModelData, BorderData } from '../../types/messages';
import { Maximize2, MoveHorizontal, MoveVertical } from 'lucide-react';

interface BoxModelProps {
  boxModel: BoxModelData;
  border?: BorderData;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  onCopy: (val: string, label: string) => void;
}

export const BoxModel: React.FC<BoxModelProps> = ({ boxModel, border, layoutMode, onCopy }) => {

  const { width, height, paddingTop, paddingRight, paddingBottom, paddingLeft, gap, cornerRadius } = boxModel;

  const renderRadius = () => {
    if (typeof cornerRadius === 'number') {
      return cornerRadius > 0 ? `${cornerRadius}px` : '0';
    }
    if (Array.isArray(cornerRadius)) {
      const [tl, tr, br, bl] = cornerRadius;
      if (tl === tr && tr === br && br === bl) {
        return tl > 0 ? `${tl}px` : '0';
      }
      return `${tl} / ${tr} / ${br} / ${bl}`;
    }
    return '0';
  };

  const radiusStr = renderRadius();

  return (
    <div className="p-3 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <Maximize2 size={12} />
          <span>Box Model & Layout</span>
        </div>
        <div className="flex items-center gap-1">
          {border && (() => {
            const iw = border.individualWeights;
            const label = iw
              ? `${iw.top} ${iw.right} ${iw.bottom} ${iw.left}px`
              : `${border.strokeWeight}px`;
            const copyValue = iw
              ? [
                  iw.top > 0 ? `border-top: ${iw.top}px ${border.strokeStyle} ${border.color};` : null,
                  iw.right > 0 ? `border-right: ${iw.right}px ${border.strokeStyle} ${border.color};` : null,
                  iw.bottom > 0 ? `border-bottom: ${iw.bottom}px ${border.strokeStyle} ${border.color};` : null,
                  iw.left > 0 ? `border-left: ${iw.left}px ${border.strokeStyle} ${border.color};` : null,
                ].filter(Boolean).join('\n')
              : `${border.strokeWeight}px ${border.strokeStyle} ${border.color}`;

            return (
              <button
                onClick={() => onCopy(copyValue, 'Border')}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 transition flex items-center gap-1"
                title="Click to copy border"
              >
                <span
                  className="inline-block w-2 h-2 rounded-full border border-amber-400"
                  style={{ backgroundColor: border.color }}
                />
                <span>b: {label}</span>
              </button>
            );
          })()}
          {radiusStr !== '0' && (
            <button
              onClick={() => onCopy(radiusStr, `Radius ${radiusStr}`)}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Click to copy radius"
            >
              r: {radiusStr}
            </button>
          )}
        </div>
      </div>

      {/* Outer geometry box */}
      <div className="relative border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="text-[9px] uppercase tracking-wider font-mono text-slate-400 dark:text-slate-500 absolute top-1 left-2">
          Bounds
        </div>

        {/* Padding Zone */}
        <div className="mt-2 relative border border-emerald-300/60 dark:border-emerald-500/30 rounded bg-emerald-50/40 dark:bg-emerald-950/20 p-2.5">
          <div className="text-[9px] uppercase tracking-wider font-mono text-emerald-600/70 dark:text-emerald-400/70 absolute top-0.5 left-1.5">
            Padding
          </div>

          {/* Top padding */}
          <div className="flex justify-center -mt-1">
            <button
              onClick={() => onCopy(`${paddingTop}px`, `Padding top ${paddingTop}px`)}
              className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 hover:font-bold transition"
            >
              {paddingTop}
            </button>
          </div>

          <div className="flex items-center justify-between my-1">
            {/* Left padding */}
            <button
              onClick={() => onCopy(`${paddingLeft}px`, `Padding left ${paddingLeft}px`)}
              className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 hover:font-bold transition"
            >
              {paddingLeft}
            </button>

            {/* Inner Content Area */}
            <div className="flex-1 mx-2 py-2 px-3 border border-blue-300/80 dark:border-blue-500/40 rounded bg-blue-50/60 dark:bg-blue-950/30 flex flex-col items-center justify-center">
              <button
                onClick={() => onCopy(`${width} × ${height}px`, `${width} × ${height}px`)}
                className="text-[11px] font-mono font-semibold text-blue-700 dark:text-blue-300 hover:underline"
              >
                {width} × {height}
              </button>

              {gap > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  {layoutMode === 'VERTICAL' ? (
                    <MoveVertical size={10} className="text-purple-500" />
                  ) : (
                    <MoveHorizontal size={10} className="text-purple-500" />
                  )}
                  <button
                    onClick={() => onCopy(`${gap}px`, `Gap ${gap}px`)}
                    className="text-[10px] font-mono text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    gap: {gap}px
                  </button>
                </div>
              )}
            </div>

            {/* Right padding */}
            <button
              onClick={() => onCopy(`${paddingRight}px`, `Padding right ${paddingRight}px`)}
              className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 hover:font-bold transition"
            >
              {paddingRight}
            </button>
          </div>

          {/* Bottom padding */}
          <div className="flex justify-center -mb-1">
            <button
              onClick={() => onCopy(`${paddingBottom}px`, `Padding bottom ${paddingBottom}px`)}
              className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 hover:font-bold transition"
            >
              {paddingBottom}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
