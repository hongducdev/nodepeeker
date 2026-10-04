/**
 * Convert a 6-digit hex color (`#RRGGBB`) and an opacity (0..1) into
 * an 8-character HEXA string (`#RRGGBBAA`).
 * If opacity is 1 or greater, returns the original hex string untouched.
 */
export function toHex8(hex: string, opacity: number): string {
  if (opacity >= 1) return hex;
  const alpha = Math.max(0, Math.min(255, Math.round(opacity * 255)));
  const aHex = alpha.toString(16).padStart(2, '0').toUpperCase();
  return `${hex}${aHex}`;
}

/**
 * Convert a 6-digit hex color (`#RRGGBB`) and an opacity (0..1) into
 * a Flutter / Android Compose Color statement: `Color(0xAARRGGBB)`.
 */
export function toArgbColor(hex: string, opacity = 1): string {
  const clampedOp = Math.max(0, Math.min(1, typeof opacity === 'number' && Number.isFinite(opacity) ? opacity : 1));
  const alpha = Math.max(0, Math.min(255, Math.round(clampedOp * 255)));
  const aHex = alpha.toString(16).padStart(2, '0').toUpperCase();
  const rgbHex = hex.replace(/^#/, '').toUpperCase().padStart(6, '0');
  return `Color(0x${aHex}${rgbHex})`;
}

/**
 * Convert a hex color (`#RRGGBB`) and opacity (0..1) into a SwiftUI `Color(...)` declaration.
 */
export function toSwiftUiColor(hex: string, opacity = 1): string {
  const clean = hex.replace(/^#/, '').padStart(6, '0');
  const r255 = parseInt(clean.slice(0, 2), 16) || 0;
  const g255 = parseInt(clean.slice(2, 4), 16) || 0;
  const b255 = parseInt(clean.slice(4, 6), 16) || 0;

  const r = Math.round((r255 / 255) * 1000) / 1000;
  const g = Math.round((g255 / 255) * 1000) / 1000;
  const b = Math.round((b255 / 255) * 1000) / 1000;
  const clampedOp = Math.max(0, Math.min(1, typeof opacity === 'number' && Number.isFinite(opacity) ? opacity : 1));
  const a = Math.round(clampedOp * 100) / 100;

  if (a < 1) {
    return `Color(red: ${r}, green: ${g}, blue: ${b}, opacity: ${a})`;
  }
  return `Color(red: ${r}, green: ${g}, blue: ${b})`;
}

