import { describe, it, expect } from 'vitest';
import {
  toTailwindFontWeight,
  toTailwindFontSize,
  toTailwindRadius,
  toTailwindDimension,
  toTailwindShadow,
  toTailwindLineHeight,
  toTailwindLetterSpacing,
  toTailwindOpacity,
} from '../src/utils/tailwind-scale';
import { ShadowData } from '../src/types/messages';

describe('toTailwindFontWeight', () => {
  it('resolves Figma style names that contain spaces', () => {
    // Figma reports these with spaces; substring matching must be space-insensitive.
    expect(toTailwindFontWeight('Semi Bold')).toBe('font-semibold');
    expect(toTailwindFontWeight('Extra Bold')).toBe('font-extrabold');
    expect(toTailwindFontWeight('Extra Light')).toBe('font-extralight');
    expect(toTailwindFontWeight('ExtraLight')).toBe('font-extralight');
  });

  it('resolves single-word and numeric weights', () => {
    expect(toTailwindFontWeight('Regular')).toBe('font-normal');
    expect(toTailwindFontWeight('Medium')).toBe('font-medium');
    expect(toTailwindFontWeight('Bold')).toBe('font-bold');
    expect(toTailwindFontWeight('Black')).toBe('font-black');
    expect(toTailwindFontWeight(600)).toBe('font-semibold');
    expect(toTailwindFontWeight(300)).toBe('font-light');
  });

  it('prefers the more specific weight when a style name contains a broader one', () => {
    // "Extra Bold" contains "bold"; it must not collapse to font-bold.
    expect(toTailwindFontWeight('Extra Bold Italic')).toBe('font-extrabold');
    expect(toTailwindFontWeight('Semi Bold Italic')).toBe('font-semibold');
  });

  it('falls back to normal for unknown style names', () => {
    expect(toTailwindFontWeight('Whatever')).toBe('font-normal');
  });
});

describe('scale lookups', () => {
  it('maps exact scale values and falls back to arbitrary syntax otherwise', () => {
    expect(toTailwindDimension(16, 'w')).toBe('w-4');
    expect(toTailwindDimension(7, 'gap')).toBe('gap-[7px]');
    expect(toTailwindDimension(0, 'p')).toBe('p-0');
  });

  it('maps radii including the bare `rounded` case and full pills', () => {
    expect(toTailwindRadius(4)).toBe('rounded');
    expect(toTailwindRadius(8)).toBe('rounded-lg');
    expect(toTailwindRadius(999)).toBe('rounded-full');
    expect(toTailwindRadius(5)).toBe('rounded-[5px]');
  });

  it('maps font sizes including the bare `text-base` case', () => {
    expect(toTailwindFontSize(16)).toBe('text-base');
    expect(toTailwindFontSize(24)).toBe('text-2xl');
    expect(toTailwindFontSize(15)).toBe('text-[15px]');
  });
});

describe('toTailwindShadow', () => {
  const shadow = (over: Partial<ShadowData> = {}): ShadowData => ({
    inner: false,
    offsetX: 0,
    offsetY: 1,
    blur: 3,
    spread: 0,
    color: '#000000',
    opacity: 0.1,
    ...over,
  });

  it('reports the exact shadow instead of snapping to a named preset', () => {
    expect(toTailwindShadow([shadow()])).toBe('shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]');
  });

  it('prefixes inset for inner shadows', () => {
    expect(toTailwindShadow([shadow({ inner: true, offsetY: 2, blur: 4, opacity: 0.25 })])).toBe(
      'shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.25)]'
    );
  });

  it('joins multiple layers into a single arbitrary value', () => {
    const cls = toTailwindShadow([
      shadow(),
      shadow({ offsetY: 4, blur: 6, color: '#FF0000', opacity: 0.2 }),
    ]);
    expect(cls).toBe(
      'shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(255,0,0,0.2)]'
    );
  });

  it('expands shorthand hex', () => {
    expect(toTailwindShadow([shadow({ color: '#fff' })])).toContain('rgba(255,255,255,');
  });

  it('emits nothing when there are no shadows', () => {
    expect(toTailwindShadow([])).toBeNull();
  });
});

describe('text and opacity converters', () => {
  it('converts percent line height to a unitless ratio and pixels to px', () => {
    expect(toTailwindLineHeight('150%')).toBe('leading-[1.5]');
    expect(toTailwindLineHeight('24px')).toBe('leading-[24px]');
    expect(toTailwindLineHeight(undefined)).toBeNull();
  });

  it('converts letter spacing, treating percent as em', () => {
    expect(toTailwindLetterSpacing('5%')).toBe('tracking-[0.05em]');
    expect(toTailwindLetterSpacing('0.5px')).toBe('tracking-[0.5px]');
    // Zero and absent spacing are the default, so they emit nothing.
    expect(toTailwindLetterSpacing('0%')).toBeNull();
    expect(toTailwindLetterSpacing(undefined)).toBeNull();
  });

  it('uses the stepped opacity scale when it matches exactly', () => {
    expect(toTailwindOpacity(0.5)).toBe('opacity-50');
    expect(toTailwindOpacity(0.75)).toBe('opacity-75');
    expect(toTailwindOpacity(0.37)).toBe('opacity-[0.37]');
    // Fully opaque is the default, so it emits nothing.
    expect(toTailwindOpacity(1)).toBeNull();
  });
});
