import { describe, it, expect } from 'vitest';
import { rgbToHex, rgbToRgba, rgbToHsl, extractColorsFromNode } from '../src/code/color-utils';

describe('color-utils', () => {
  it('converts RGB float values to HEX accurately', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
    expect(rgbToHex(1, 1, 1)).toBe('#FFFFFF');
    expect(rgbToHex(1, 0, 0)).toBe('#FF0000');
    expect(rgbToHex(0, 1, 0)).toBe('#00FF00');
    expect(rgbToHex(0, 0, 1)).toBe('#0000FF');
    expect(rgbToHex(0.05, 0.6, 1)).toBe('#0D99FF'); // Figma brand blue
  });

  it('converts RGB float values to RGBA string', () => {
    expect(rgbToRgba(1, 1, 1, 1)).toBe('rgb(255, 255, 255)');
    expect(rgbToRgba(1, 0, 0, 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    expect(rgbToRgba(0, 0, 0, 0.75)).toBe('rgba(0, 0, 0, 0.75)');
  });

  it('converts RGB float values to HSL string', () => {
    expect(rgbToHsl(0, 0, 0)).toBe('hsl(0, 0%, 0%)');
    expect(rgbToHsl(1, 1, 1)).toBe('hsl(0, 0%, 100%)');
    expect(rgbToHsl(1, 0, 0)).toBe('hsl(0, 100%, 50%)');
    expect(rgbToHsl(1, 0, 0, 0.5)).toBe('hsla(0, 100%, 50%, 0.5)');
    expect(rgbToHsl(0, 0, 0, 0.8)).toBe('hsla(0, 0%, 0%, 0.8)');
  });

  it('extracts colors from a mock scene node with solid fills and strokes', () => {
    const mockNode = {
      id: 'mock-1',
      name: 'Mock Box',
      type: 'RECTANGLE',
      fills: [
        {
          type: 'SOLID',
          visible: true,
          color: { r: 0.1, g: 0.2, b: 0.3 },
          opacity: 0.8,
        },
        {
          type: 'SOLID',
          visible: false, // hidden fill should be ignored
          color: { r: 1, g: 0, b: 0 },
        },
      ],
      strokes: [
        {
          type: 'SOLID',
          visible: true,
          color: { r: 0.9, g: 0.9, b: 0.9 },
        },
      ],
    } as unknown as SceneNode;

    const colors = extractColorsFromNode(mockNode);
    expect(colors.length).toBe(2);

    const fill = colors.find((c) => c.source === 'fill');
    expect(fill).toBeDefined();
    expect(fill?.opacity).toBe(0.8);

    const stroke = colors.find((c) => c.source === 'stroke');
    expect(stroke).toBeDefined();
    expect(stroke?.hex).toBe('#E6E6E6');
  });

  it('extracts gradient stops correctly', () => {
    const mockGradient = {
      id: 'mock-2',
      name: 'Gradient Box',
      type: 'FRAME',
      fills: [
        {
          type: 'GRADIENT_LINEAR',
          visible: true,
          gradientStops: [
            { color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 },
            { color: { r: 0, g: 0, b: 1, a: 0.5 }, position: 1 },
          ],
        },
      ],
      strokes: [],
    } as unknown as SceneNode;

    const colors = extractColorsFromNode(mockGradient);
    expect(colors.length).toBe(2);
    expect(colors[0].hex).toBe('#FF0000');
    expect(colors[1].hex).toBe('#0000FF');
    expect(colors[1].opacity).toBe(0.5);
  });
});
