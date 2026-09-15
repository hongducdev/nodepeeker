import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CodeHighlighter } from '../src/ui/components/CodeHighlighter';

// React.createElement is used instead of JSX so this file stays .ts.
const render = (code: string, language: 'css' | 'tailwind') =>
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

  it('categorizes Tailwind tokens so different utility families are visually distinct', () => {
    const html = render('p-4 text-sm', 'tailwind');
    // Spacing family vs typography family must not collapse to one shared style.
    expect(html).toContain('text-emerald-400');
    expect(html).toContain('text-pink-400');
  });
});
