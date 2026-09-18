import { ColorToken } from '../types/messages';

export function rgbFloatTo255(val: number): number {
  return Math.max(0, Math.min(255, Math.round(val * 255)));
}

export function rgbToHex(r: number, g: number, b: number): string {
  const r255 = rgbFloatTo255(r);
  const g255 = rgbFloatTo255(g);
  const b255 = rgbFloatTo255(b);
  const hex = ((1 << 24) + (r255 << 16) + (g255 << 8) + b255)
    .toString(16)
    .slice(1)
    .toUpperCase();
  return `#${hex}`;
}

export function rgbToRgba(r: number, g: number, b: number, a = 1): string {
  const r255 = rgbFloatTo255(r);
  const g255 = rgbFloatTo255(g);
  const b255 = rgbFloatTo255(b);
  const alpha = Math.round(a * 100) / 100;
  if (alpha === 1) {
    return `rgb(${r255}, ${g255}, ${b255})`;
  }
  return `rgba(${r255}, ${g255}, ${b255}, ${alpha})`;
}

export function rgbToHsl(r: number, g: number, b: number, a = 1): string {
  const rNorm = Math.max(0, Math.min(1, r));
  const gNorm = Math.max(0, Math.min(1, g));
  const bNorm = Math.max(0, Math.min(1, b));

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);
  const alpha = Math.round(a * 100) / 100;

  if (alpha === 1) {
    return `hsl(${hDeg}, ${sPct}%, ${lPct}%)`;
  }
  return `hsla(${hDeg}, ${sPct}%, ${lPct}%, ${alpha})`;
}

export function extractColorsFromNode(node: SceneNode): ColorToken[] {
  const tokenMap = new Map<string, ColorToken>();

  function processPaint(paint: Paint, source: 'fill' | 'stroke') {
    if (paint.visible === false) return;

    if (paint.type === 'SOLID') {
      const { r, g, b } = paint.color;
      const opacity = typeof paint.opacity === 'number' ? paint.opacity : 1;
      const hex = rgbToHex(r, g, b);
      const rgba = rgbToRgba(r, g, b, opacity);
      const hsl = rgbToHsl(r, g, b, opacity);
      const key = `${hex}-${opacity}-${source}`;

      if (!tokenMap.has(key)) {
        tokenMap.set(key, { hex, rgba, hsl, opacity, source });
      }
    } else if (
      paint.type === 'GRADIENT_LINEAR' ||
      paint.type === 'GRADIENT_RADIAL' ||
      paint.type === 'GRADIENT_ANGULAR' ||
      paint.type === 'GRADIENT_DIAMOND'
    ) {
      paint.gradientStops.forEach((stop) => {
        const { r, g, b, a } = stop.color;
        const opacity = Math.round((typeof a === 'number' ? a : 1) * 100) / 100;
        const hex = rgbToHex(r, g, b);
        const rgba = rgbToRgba(r, g, b, opacity);
        const hsl = rgbToHsl(r, g, b, opacity);
        const key = `${hex}-${opacity}-${source}`;

        if (!tokenMap.has(key)) {
          tokenMap.set(key, { hex, rgba, hsl, opacity, source, name: 'Gradient Stop' });
        }
      });
    }
  }

  function scan(target: SceneNode, isChild = false) {
    if ('fills' in target && Array.isArray(target.fills)) {
      target.fills.forEach((p) => processPaint(p, 'fill'));
    }
    if ('strokes' in target && Array.isArray(target.strokes)) {
      target.strokes.forEach((p) => processPaint(p, 'stroke'));
    }

    // Also scan direct children if not already scanning children
    if (!isChild && 'children' in target && Array.isArray(target.children)) {
      for (const child of target.children) {
        scan(child, true);
      }
    }
  }

  scan(node, false);
  return Array.from(tokenMap.values());
}

export function uint8ArrayToString(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(bytes);
  }
  let result = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    result += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return result;
}
