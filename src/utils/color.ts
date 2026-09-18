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
