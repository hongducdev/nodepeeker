import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CodeHighlighter } from '../src/ui/components/CodeHighlighter';

// React.createElement is used instead of JSX so this file stays .ts.
const render = (code: string, language: 'css' | 'tailwind' | 'svg') =>
  renderToStaticMarkup(createElement(CodeHighlighter, { code, language }));

describe('CodeHighlighter', () => {
  it('renders the placeholder when no code is supplied', () => {
    const html = render('', 'css');
    expect(html).toContain('No styles extracted');
  });

  it('numbers every CSS declaration line and labels the property separately from its value', () => {
    const html = render('width: 320px;\nheight: 48px;', 'css');

    // One numbered gutter cell per line.
    expect(html).toContain('>1<');
    expect(html).toContain('>2<');

    // Property names are tokenized as a distinct span from the value.
    expect(html).toContain('>width<');
    expect(html).toContain('>height<');
    expect(html).toContain('>320px<');
    expect(html).toContain('>48px<');
  });

  it('emits a live color swatch behind every hex value in a CSS value', () => {
    const html = render('color: #2563EB;', 'css');
    expect(html).toContain('#2563EB');
    expect(html).toContain('background-color:#2563EB');
  });

  it('treats a leading /* block as a comment rather than a declaration', () => {
    const html = render('/* Dimensions */\nwidth: 10px;', 'css');
    expect(html).toContain('italic');
    expect(html).toContain('/* Dimensions */');
  });

  it('renders one token per Tailwind class and chips the hex inside arbitrary values', () => {
    const html = render('flex p-4 bg-[#2563EB] rounded-lg', 'tailwind');

    for (const cls of ['flex', 'p-4', 'bg-[#2563EB]', 'rounded-lg']) {
      expect(html, `missing token ${cls}`).toContain(cls);
    }
    expect(html).toContain('background-color:#2563EB');
  });

  it('gives different Tailwind utility families distinct colours', () => {
    // Assert the contract (families stay visually distinguishable), not the
    // specific palette shades -- those are a design choice that may change.
    const chipClass = (code: string) => {
      const html = render(code, 'tailwind');
      return html.match(/<span class="(inline-flex[^"]*)"/)?.[1] ?? '';
    };

    const spacing = chipClass('p-4');
    const typography = chipClass('text-sm');

    expect(spacing).not.toBe('');
    expect(typography).not.toBe('');
    expect(spacing).not.toBe(typography);
  });
});

describe('CodeHighlighter (svg)', () => {
  const SVG = '<svg width="148" height="40">\n<rect fill="#1E66F5"/>\n</svg>';

  it('renders the svg placeholder when the node produced no markup', () => {
    expect(render('', 'svg')).toContain('No SVG available for this layer');
  });

  it('numbers each markup line', () => {
    const html = render(SVG, 'svg');
    expect(html).toContain('>1<');
    expect(html).toContain('>2<');
    expect(html).toContain('>3<');
  });

  it('keeps element names, attribute names and plain values visually distinct', () => {
    // Assert distinguishability rather than exact palette shades: the palette is
    // CSS-variable driven and may be re-themed without breaking this contract.
    const html = render('<svg width="148"></svg>', 'svg');
    const classOf = (escapedText: string) =>
      html.match(new RegExp(`class="([^"]*)">${escapedText}<`))?.[1] ?? '';

    const element = classOf('svg');
    const attribute = classOf('width');
    const value = classOf('&quot;148&quot;');

    expect(element).not.toBe('');
    expect(attribute).not.toBe('');
    expect(value).not.toBe('');
    expect(new Set([element, attribute, value]).size).toBe(3);
  });

  it('chips hex attribute values so fill colours are visible at a glance', () => {
    const html = render(SVG, 'svg');
    expect(html).toContain('#1E66F5');
    expect(html).toContain('background-color:#1E66F5');
  });

  it('treats a non-colour attribute value as a plain value, not a swatch', () => {
    const html = render('<svg width="148"></svg>', 'svg');
    // A swatch is the only thing that can emit background-color in SVG output.
    expect(html).not.toContain('background-color');
  });

  it('renders the comment inside its own styled span', () => {
    const html = render('<!-- exported by Figma -->', 'svg');
    expect(html).toMatch(/class="[^"]*italic[^"]*">&lt;!-- exported by Figma --&gt;</);
  });
});
