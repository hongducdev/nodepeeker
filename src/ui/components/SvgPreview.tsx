import React from 'react';
import { Eye } from 'lucide-react';

interface SvgPreviewProps {
  /** The layer's exported markup, as fetched by the UI thread on demand. */
  markup: string;
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
export const SvgPreview: React.FC<SvgPreviewProps> = ({ markup }) => {
  // Nothing exported yet (or the export failed) -- the code box below already says so, and an
  // empty board would only flash a box that is about to be replaced.
  if (!markup.trim()) {
    return null;
  }

  return (
    <div className="mb-2">
      <div className="flex items-center gap-1 text-[11px] font-medium text-overlay1 mb-2">
        <Eye size={12} />
        <span>Preview</span>
      </div>
      <div
        className="svg-preview-board h-40 rounded-md border border-surface0 p-2 flex items-center justify-center overflow-hidden"
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    </div>
  );
};
