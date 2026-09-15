import { describe, it, expect } from 'vitest';
import {
  toTailwindFontWeight,
  toTailwindFontSize,
  toTailwindRadius,
  toTailwindDimension,
} from '../src/utils/tailwind-scale';

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
