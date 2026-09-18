import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SvgPreview } from '../src/ui/components/SvgPreview';

// Shaped like a real Figma export: a root `<svg>` carrying its own width/height/viewBox, which
// is what the fit rules in styles.css scale against.
const MARKUP =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
  '<circle cx="12" cy="12" r="10" fill="#1e66f5"/></svg>';

const render = (markup: string) => renderToStaticMarkup(createElement(SvgPreview, { markup }));

describe('SvgPreview', () => {
  it('injects the exported markup as elements rather than escaped text', () => {
    const html = render(MARKUP);
    // Verbatim: the preview must show exactly what Copy / Download ship.
    expect(html).toContain(MARKUP);
    // The failure mode worth guarding is a regression to printing the markup -- React escaping
    // it would leave the string on screen and no actual artwork.
    expect(html).not.toContain('&lt;');
  });

  it('labels the rendering as a preview', () => {
    expect(render(MARKUP)).toContain('>Preview<');
  });

  it('renders a Copy SVG button when onCopy is provided', () => {
    const html = renderToStaticMarkup(
      createElement(SvgPreview, { markup: MARKUP, onCopy: () => {}, isCopied: false })
    );
    expect(html).toContain('Copy SVG');
    expect(html).toContain('Click to copy');
  });

  it('shows Copied SVG label when isCopied is true', () => {
    const html = renderToStaticMarkup(
      createElement(SvgPreview, { markup: MARKUP, onCopy: () => {}, isCopied: true })
    );
    expect(html).toContain('Copied SVG');
  });

  it('renders nothing when the export produced no markup', () => {
    expect(render('')).toBe('');
    expect(render('  \n\t ')).toBe('');
  });
});
