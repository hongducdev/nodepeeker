export const SPACING_SCALE: Record<number, string> = {
  0: '0',
  1: 'px',
  2: '0.5',
  4: '1',
  6: '1.5',
  8: '2',
  10: '2.5',
  12: '3',
  14: '3.5',
  16: '4',
  20: '5',
  24: '6',
  28: '7',
  32: '8',
  36: '9',
  40: '10',
  44: '11',
  48: '12',
  56: '14',
  64: '16',
  80: '20',
  96: '24',
  112: '28',
  128: '32',
  144: '36',
  160: '40',
  176: '44',
  192: '48',
  208: '52',
  224: '56',
  240: '60',
  256: '64',
  288: '72',
  320: '80',
  384: '96',
};

export const RADIUS_SCALE: Record<number, string> = {
  0: 'none',
  2: 'sm',
  4: '',
  6: 'md',
  8: 'lg',
  12: 'xl',
  16: '2xl',
  24: '3xl',
};

export const FONT_SIZE_SCALE: Record<number, string> = {
  12: 'xs',
  14: 'sm',
  16: 'base',
  18: 'lg',
  20: 'xl',
  24: '2xl',
  30: '3xl',
  36: '4xl',
  48: '5xl',
  60: '6xl',
  72: '7xl',
  96: '8xl',
  128: '9xl',
};

export function toTailwindDimension(px: number, prefix: string): string {
  if (px <= 0) return `${prefix}-0`;
  const scaleVal = SPACING_SCALE[px];
  if (scaleVal !== undefined) {
    return `${prefix}-${scaleVal}`;
  }
  return `${prefix}-[${px}px]`;
}

export function toTailwindRadius(r: number): string {
  if (r <= 0) return 'rounded-none';
  if (r >= 999) return 'rounded-full';
  const scale = RADIUS_SCALE[r];
  if (scale !== undefined) {
    return scale === '' ? 'rounded' : `rounded-${scale}`;
  }
  return `rounded-[${r}px]`;
}

export function toTailwindFontSize(px: number): string {
  const scale = FONT_SIZE_SCALE[px];
  if (scale !== undefined) {
    return `text-${scale}`;
  }
  return `text-[${px}px]`;
}

export function toTailwindFontWeight(weight: string | number): string {
  // Figma font style names contain spaces ("Semi Bold", "Extra Light"); strip
  // everything but alphanumerics so substring matching works for both spellings.
  const wStr = String(weight).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (wStr.includes('thin') || wStr === '100') return 'font-thin';
  if (wStr.includes('extralight') || wStr === '200') return 'font-extralight';
  if (wStr.includes('light') || wStr === '300') return 'font-light';
  if (wStr.includes('medium') || wStr === '500') return 'font-medium';
  if (wStr.includes('semibold') || wStr === '600') return 'font-semibold';
  if (wStr.includes('extrabold') || wStr === '800') return 'font-extrabold';
  if (wStr.includes('black') || wStr === '900') return 'font-black';
  if (wStr.includes('bold') || wStr === '700') return 'font-bold';
  return 'font-normal';
}
