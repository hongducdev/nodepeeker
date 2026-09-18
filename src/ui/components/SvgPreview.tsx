import React from 'react';
import { Eye, Copy, Check } from 'lucide-react';

interface SvgPreviewProps {
  /** The layer's exported markup, as fetched by the UI thread on demand. */
  markup: string;
  onCopy?: (val: string, label: string) => void;
  isCopied?: boolean;
}

/**
 * Rendered preview of the SVG markup the sandbox exported for the current layer.
 *
 * The markup is injected rather than re-encoded into a data-URI `<img>` on purpose: Figma embeds
 * raster fills as `<image href="data:…">`, which an `<img>`-embedded SVG may refuse to load, and
 * this has to show exactly what Copy / Download ship.
 *
 * Injection is trusted by construction rather than sanitised: the string can only come from
 * Figma's own exporter over the sandbox bridge (`exportAsync({ format: 'SVG' })` in `code.ts`),
 * never from a third party, and the iframe is offline (`networkAccess.allowedDomains: ["none"]`)
 * with no privileged API. `<script>` inserted through `innerHTML` does not execute, but
 * event-handler attributes *would*, so this stays on the same trust boundary as the existing Copy
 * and Download paths, which ship the identical string. A sanitizer is deliberately not applied:
 * one could corrupt the artifact being previewed — stripping `on…=` text out of, say, a `d`
 * attribute's value would show the user an SVG that is not the one they are about to export.
 *
 * The fit-and-scale rules live in `styles.css` (`.svg-preview-board`).
 */
export const SvgPreview: React.FC<SvgPreviewProps> = ({ markup, onCopy, isCopied }) => {
  // Nothing exported yet (or the export failed) -- the code box below already says so, and an
  // empty board would only flash a box that is about to be replaced.
  if (!markup.trim()) {
    return null;
  }

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-[11px] font-medium text-overlay1">
          <Eye size={12} />
          <span>Preview</span>
        </div>
        {onCopy && (
          <button
            onClick={() => onCopy(markup, 'SVG markup')}
            className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-surface0 hover:bg-surface1 text-subtext1 hover:text-text transition border border-surface1/60"
            title="Copy raw SVG markup to clipboard"
          >
            {isCopied ? (
              <>
                <Check size={11} className="text-green" />
                <span className="text-green">Copied SVG</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span>Copy SVG</span>
              </>
            )}
          </button>
        )}
      </div>
      <div
        className="relative group cursor-pointer"
        onClick={() => onCopy?.(markup, 'SVG markup')}
        title="Click to copy SVG"
      >
        <div
          className="svg-preview-board h-40 rounded-md border border-surface0 p-2 flex items-center justify-center overflow-hidden"
          dangerouslySetInnerHTML={{ __html: markup }}
        />
        {onCopy && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-base/80 backdrop-blur-xs text-subtext1 px-1.5 py-0.5 rounded text-[9px] font-mono border border-surface1 flex items-center gap-1 pointer-events-none">
            <Copy size={9} />
            <span>Click to copy</span>
          </div>
        )}
      </div>
    </div>
  );
};
