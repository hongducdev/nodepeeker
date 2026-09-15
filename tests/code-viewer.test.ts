import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CodeViewer } from '../src/ui/components/CodeViewer';
import { NodeInspectionData } from '../src/types/messages';

// renderToStaticMarkup skips useEffect, so the initial (default) tab is what we
// observe -- which is exactly the contract under test. `svg` is now a separate
// lazily-fetched prop rather than a field on the inspection data.
const render = (data: NodeInspectionData, svg?: string) =>
  renderToStaticMarkup(
    createElement(CodeViewer, { data, svg, onCopy: () => {}, copiedText: null })
  );

// Assertions target what a user reads, so unescape entities and drop tags.
const ENTITIES: Record<string, string> = {
  '&#x27;': "'",
  '&quot;': '"',
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
};

const decode = (html: string) =>
  html.replace(/&#x27;|&quot;|&lt;|&gt;|&amp;/g, (entity) => ENTITIES[entity]);

const textOf = (html: string) => decode(html).replace(/<[^>]*>/g, '');

const baseData = (overrides: Partial<NodeInspectionData> = {}): NodeInspectionData => ({
  id: '1:2',
  name: 'Button',
  type: 'FRAME',
  css: { display: 'flex', 'background-color': '#1e66f5' },
  colors: [],
  boxModel: {
    width: 148,
    height: 40,
    x: 0,
    y: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    gap: 0,
    cornerRadius: 0,
  },
  ...overrides,
});

describe('CodeViewer', () => {
  it('offers CSS, Tailwind and SVG tabs', () => {
    const html = render(baseData(), '<svg/>');
    expect(html).toContain('>CSS<');
    expect(html).toContain('>Tailwind<');
    expect(html).toContain('>SVG<');
  });

  it('still defaults to the CSS tab', () => {
    const html = render(baseData(), '<svg viewBox="0 0 4 4"/>');
    // CSS declaration from data.css is rendered...
    expect(textOf(html)).toContain('display');
    expect(textOf(html)).toContain('#1e66f5');
    // ...and no SVG-only text is, because SVG is not the default tab.
    // (Asserting on visible text: raw markup is split across token spans.)
    expect(textOf(html)).not.toContain('viewBox');
  });

  it('advertises the 3 / S shortcut for the SVG tab', () => {
    const html = render(baseData(), '<svg/>');
    expect(decode(html)).toContain("Shortcut: Press '3' or 'S'");
  });

  it('merges border declarations into the CSS tab', () => {
    const html = render(
      baseData({
        border: {
          strokeWeight: 2,
          strokeAlign: 'INSIDE',
          strokeStyle: 'dashed',
          color: '#7287FD',
        },
      })
    );
    expect(textOf(html)).toContain('border: 2px dashed #7287FD;');
  });
});
