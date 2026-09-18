import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ColorPalette } from '../src/ui/components/ColorPalette';
import { ColorToken } from '../src/types/messages';
import { toHex8 } from '../src/utils/color';

const render = (colors: ColorToken[]) =>
  renderToStaticMarkup(
    createElement(ColorPalette, {
      colors,
      onCopy: () => {},
      copiedText: null,
    })
  );

describe('ColorPalette', () => {
  it('renders nothing when colors list is empty', () => {
    const html = render([]);
    expect(html).toBe('');
  });

  it('renders solid hex color without opacity suffix when opacity is 1', () => {
    const html = render([
      {
        hex: '#2563EB',
        rgba: 'rgb(37, 99, 235)',
        hsl: 'hsl(221, 83%, 53%)',
        opacity: 1,
        source: 'fill',
      },
    ]);
    expect(html).toContain('#2563EB');
    expect(html).not.toContain('#2563EB 100%');
  });

  it('renders 8-character HEXA alpha code when opacity is reduced (< 1) alongside % badge', () => {
    const html = render([
      {
        hex: '#1E66F5',
        rgba: 'rgba(30, 102, 245, 0.5)',
        hsl: 'hsla(220, 91%, 54%, 0.5)',
        opacity: 0.5,
        source: 'fill',
      },
      {
        hex: '#EF4444',
        rgba: 'rgba(239, 68, 68, 0.8)',
        hsl: 'hsla(0, 84%, 60%, 0.8)',
        opacity: 0.8,
        source: 'stroke',
      },
    ]);

    // 8-character HEXA alpha code
    expect(html).toContain('#1E66F580');
    expect(html).toContain('#EF4444CC');

    // Also displays the human-friendly % opacity badge
    expect(html).toContain('>50%<');
    expect(html).toContain('>80%<');
  });

  describe('toHex8 utility', () => {
    it('leaves full opacity hex codes as 6-digit hex', () => {
      expect(toHex8('#1E66F5', 1)).toBe('#1E66F5');
      expect(toHex8('#FFFFFF', 1.2)).toBe('#FFFFFF');
    });

    it('converts opacity float to 2-digit uppercase hex alpha', () => {
      expect(toHex8('#1E66F5', 0.5)).toBe('#1E66F580');
      expect(toHex8('#000000', 0)).toBe('#00000000');
      expect(toHex8('#FFFFFF', 0.1)).toBe('#FFFFFF1A');
      expect(toHex8('#FF0000', 0.25)).toBe('#FF000040');
      expect(toHex8('#00FF00', 0.75)).toBe('#00FF00BF');
      expect(toHex8('#EF4444', 0.8)).toBe('#EF4444CC');
    });
  });
});
