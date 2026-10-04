import type { NodeInspectionData, BoundVariableToken } from '../../types/messages.js';
import { toArgbColor } from '../color.js';
import { getPlatformToken } from './token-utils.js';

export function transpileToCompose(
  data: NodeInspectionData,
  options?: { useTokens?: boolean }
): string {
  const { boxModel, border, shadows, opacity, typography, colors, type } = data;

  const useTokens = Boolean(options?.useTokens && data.variables && data.variables.length > 0);
  const varMap = new Map<string, BoundVariableToken>();
  if (useTokens && data.variables) {
    for (const v of data.variables) {
      varMap.set(v.field, v);
    }
  }

  if (type === 'TEXT' && typography) {
    const textParams: string[] = [`  text = "${data.name || 'Text'}",`];
    const styleParams: string[] = [];

    if (varMap.has('fontSize')) {
      styleParams.push(`    fontSize = ${getPlatformToken(varMap.get('fontSize')!, 'compose')},`);
    } else if (typography.fontSize) {
      styleParams.push(`    fontSize = ${typography.fontSize}.sp,`);
    }
    if (typography.fontWeight) {
      const w = String(typography.fontWeight).toLowerCase();
      if (w.includes('bold')) styleParams.push(`    fontWeight = FontWeight.Bold,`);
      else if (w.includes('semi')) styleParams.push(`    fontWeight = FontWeight.SemiBold,`);
      else if (w.includes('medium')) styleParams.push(`    fontWeight = FontWeight.Medium,`);
    }
    if (varMap.has('fill')) {
      styleParams.push(`    color = ${getPlatformToken(varMap.get('fill')!, 'compose')},`);
    } else {
      const fill = colors.find((c) => c.source === 'fill');
      if (fill) {
        styleParams.push(`    color = ${toArgbColor(fill.hex, fill.opacity)},`);
      }
    }

    if (styleParams.length > 0) {
      textParams.push(`  style = TextStyle(\n${styleParams.join('\n')}\n  ),`);
    }

    return `Text(\n${textParams.join('\n')}\n)`;
  }

  const modifiers: string[] = ['Modifier'];

  // 1. Size
  if (varMap.has('width') && varMap.has('height')) {
    modifiers.push(`  .size(width = ${getPlatformToken(varMap.get('width')!, 'compose')}, height = ${getPlatformToken(varMap.get('height')!, 'compose')})`);
  } else if (varMap.has('width')) {
    modifiers.push(`  .width(${getPlatformToken(varMap.get('width')!, 'compose')})`);
  } else if (varMap.has('height')) {
    modifiers.push(`  .height(${getPlatformToken(varMap.get('height')!, 'compose')})`);
  } else if (boxModel.width > 0 && boxModel.height > 0) {
    modifiers.push(`  .size(width = ${Math.round(boxModel.width)}.dp, height = ${Math.round(boxModel.height)}.dp)`);
  } else if (boxModel.width > 0) {
    modifiers.push(`  .width(${Math.round(boxModel.width)}.dp)`);
  } else if (boxModel.height > 0) {
    modifiers.push(`  .height(${Math.round(boxModel.height)}.dp)`);
  }

  // 2. Padding
  const { paddingTop: pt, paddingRight: pr, paddingBottom: pb, paddingLeft: pl } = boxModel;
  if (varMap.has('padding')) {
    modifiers.push(`  .padding(${getPlatformToken(varMap.get('padding')!, 'compose')})`);
  } else if (pt === pb && pr === pl && pt === pr && pt > 0) {
    modifiers.push(`  .padding(${pt}.dp)`);
  } else if (pt === pb && pr === pl && (pt > 0 || pr > 0)) {
    const parts: string[] = [];
    if (pr > 0) parts.push(`horizontal = ${pr}.dp`);
    if (pt > 0) parts.push(`vertical = ${pt}.dp`);
    modifiers.push(`  .padding(${parts.join(', ')})`);
  } else if (pt > 0 || pr > 0 || pb > 0 || pl > 0) {
    const parts: string[] = [];
    if (pl > 0) parts.push(`start = ${pl}.dp`);
    if (pt > 0) parts.push(`top = ${pt}.dp`);
    if (pr > 0) parts.push(`end = ${pr}.dp`);
    if (pb > 0) parts.push(`bottom = ${pb}.dp`);
    modifiers.push(`  .padding(${parts.join(', ')})`);
  }

  // 3. Shape
  const { cornerRadius } = boxModel;
  let shapeExpr = '';
  if (varMap.has('cornerRadius')) {
    shapeExpr = `RoundedCornerShape(${getPlatformToken(varMap.get('cornerRadius')!, 'compose')})`;
  } else if (typeof cornerRadius === 'number' && cornerRadius > 0) {
    shapeExpr = `RoundedCornerShape(${cornerRadius}.dp)`;
  } else if (Array.isArray(cornerRadius) && cornerRadius.length > 0 && cornerRadius[0] > 0) {
    shapeExpr = `RoundedCornerShape(${cornerRadius[0]}.dp)`;
  }

  // 4. Shadows
  if (shadows && shadows.length > 0) {
    const s = shadows[0];
    if (shapeExpr) {
      modifiers.push(`  .shadow(elevation = ${s.blur}.dp, shape = ${shapeExpr})`);
    } else {
      modifiers.push(`  .shadow(elevation = ${s.blur}.dp)`);
    }
  }

  // 5. Background
  if (varMap.has('fill')) {
    const col = getPlatformToken(varMap.get('fill')!, 'compose');
    if (shapeExpr) {
      modifiers.push(`  .background(color = ${col}, shape = ${shapeExpr})`);
    } else {
      modifiers.push(`  .background(color = ${col})`);
    }
  } else {
    const fill = colors.find((c) => c.source === 'fill');
    if (fill) {
      const col = toArgbColor(fill.hex, fill.opacity);
      if (shapeExpr) {
        modifiers.push(`  .background(color = ${col}, shape = ${shapeExpr})`);
      } else {
        modifiers.push(`  .background(color = ${col})`);
      }
    }
  }

  // 6. Border
  if (border && border.strokeWeight > 0) {
    const borderCol = toArgbColor(border.color, border.opacity ?? 1);
    if (shapeExpr) {
      modifiers.push(`  .border(width = ${border.strokeWeight}.dp, color = ${borderCol}, shape = ${shapeExpr})`);
    } else {
      modifiers.push(`  .border(width = ${border.strokeWeight}.dp, color = ${borderCol})`);
    }
  }

  // 7. Opacity
  if (typeof opacity === 'number' && opacity < 1) {
    modifiers.push(`  .alpha(${opacity}f)`);
  }

  return modifiers.join('\n');
}
