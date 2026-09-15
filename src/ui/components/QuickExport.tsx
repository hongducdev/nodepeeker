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
      <div className="flex items-center gap-1 text-[11px] font-medium text-overlay1 mb-2">
        <Download size={12} />
        <span>1-Click Asset Export</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <button
          disabled={isExporting}
          onClick={handleCopySvg}
          className="flex flex-col items-center justify-center p-2 rounded-md border border-surface1 bg-surface0 hover:bg-surface1/60 text-subtext1 hover:border-surface2 transition disabled:opacity-50 group"
          title="Copy raw SVG markup to clipboard"
        >
          <FileCode size={15} className="text-peach mb-1 group-hover:scale-110 transition" />
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
          className="flex flex-col items-center justify-center p-2 rounded-md border border-surface1 bg-surface0 hover:bg-surface1/60 text-subtext1 hover:border-surface2 transition disabled:opacity-50 group"
          title="Download SVG vector file"
        >
          <FileDown size={15} className="text-green mb-1 group-hover:scale-110 transition" />
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
          className="flex flex-col items-center justify-center p-2 rounded-md border border-surface1 bg-surface0 hover:bg-surface1/60 text-subtext1 hover:border-surface2 transition disabled:opacity-50 group"
          title="Download 2x Retina PNG image"
        >
          <Image size={15} className="text-blue mb-1 group-hover:scale-110 transition" />
          <span className="text-[10px] font-medium">PNG @2x</span>
        </button>
      </div>
    </div>
  );
};
