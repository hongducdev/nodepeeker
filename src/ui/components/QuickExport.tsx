import React from 'react';
import { Download, FileCode, Image, FileDown } from 'lucide-react';
import { UIToPluginMessage } from '../../types/messages';

interface QuickExportProps {
  onExport: (msg: UIToPluginMessage) => void;
  isExporting: boolean;
  svgContent?: string;
  onCopy?: (text: string, label: string) => void;
}

export const QuickExport: React.FC<QuickExportProps> = ({ onExport, isExporting, svgContent, onCopy }) => {
  const handleCopySvg = () => {
    if (svgContent && onCopy) {
      onCopy(svgContent, 'SVG Markup');
    } else {
      onExport({
        type: 'REQUEST_EXPORT',
        format: 'SVG',
        action: 'copy',
      });
    }
  };
  return (
    <div className="p-3">
      <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2">
        <Download size={12} />
        <span>1-Click Asset Export</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <button
          disabled={isExporting}
          onClick={handleCopySvg}
          className="flex flex-col items-center justify-center p-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition disabled:opacity-50 group"
          title="Copy raw SVG markup to clipboard"
        >
          <FileCode size={15} className="text-amber-500 mb-1 group-hover:scale-110 transition" />
          <span className="text-[10px] font-medium">Copy SVG</span>
        </button>

        <button
          disabled={isExporting}
          onClick={() =>
            onExport({
              type: 'REQUEST_EXPORT',
              format: 'SVG',
              action: 'download',
            })
          }
          className="flex flex-col items-center justify-center p-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition disabled:opacity-50 group"
          title="Download SVG vector file"
        >
          <FileDown size={15} className="text-emerald-500 mb-1 group-hover:scale-110 transition" />
          <span className="text-[10px] font-medium">SVG File</span>
        </button>

        <button
          disabled={isExporting}
          onClick={() =>
            onExport({
              type: 'REQUEST_EXPORT',
              format: 'PNG',
              scale: 2,
              action: 'download',
            })
          }
          className="flex flex-col items-center justify-center p-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition disabled:opacity-50 group"
          title="Download 2x Retina PNG image"
        >
          <Image size={15} className="text-blue-500 mb-1 group-hover:scale-110 transition" />
          <span className="text-[10px] font-medium">PNG @2x</span>
        </button>
      </div>
    </div>
  );
};
