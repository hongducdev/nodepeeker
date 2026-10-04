import type { NodeInspectionData, BoundVariableToken } from '../../types/messages.js';
import { toSwiftUiColor } from '../color.js';
import { getPlatformToken } from './token-utils.js';

export function transpileToSwiftUI(
  data: NodeInspectionData,
  options?: { useTokens?: boolean }
): string {
  const { boxModel, border, shadows, opacity, typography, colors, type } = data;
  const modifiers: string[] = [];

  const useTokens = Boolean(options?.useTokens && data.variables && data.variables.length > 0);
  const varMap = new Map<string, BoundVariableToken>();
  if (useTokens && data.variables) {
    for (const v of data.variables) {
      varMap.set(v.field, v);
    }
  }

  if (type === 'TEXT' && typography) {
    const textMods: string[] = [];
    if (varMap.has('fontSize') && varMap.has('fontFamily')) {
      textMods.push(`.font(.custom(${getPlatformToken(varMap.get('fontFamily')!, 'swiftui')}, size: ${getPlatformToken(varMap.get('fontSize')!, 'swiftui')}))`);
    } else if (varMap.has('fontSize')) {
      textMods.push(`.font(.system(size: ${getPlatformToken(varMap.get('fontSize')!, 'swiftui')}))`);
    } else if (varMap.has('fontFamily') && typography.fontSize) {
      textMods.push(`.font(.custom(${getPlatformToken(varMap.get('fontFamily')!, 'swiftui')}, size: ${typography.fontSize}))`);
    } else if (typography.fontFamily && typography.fontSize) {
      textMods.push(`.font(.custom("${typography.fontFamily}", size: ${typography.fontSize}))`);
    } else if (typography.fontSize) {
      textMods.push(`.font(.system(size: ${typography.fontSize}))`);
    }

    if (varMap.has('fontWeight')) {
      textMods.push(`.fontWeight(${getPlatformToken(varMap.get('fontWeight')!, 'swiftui')})`);
    } else if (typography.fontWeight) {
      const w = String(typography.fontWeight).toLowerCase();
      if (w.includes('bold')) textMods.push(`.fontWeight(.bold)`);
      else if (w.includes('semi')) textMods.push(`.fontWeight(.semibold)`);
      else if (w.includes('medium')) textMods.push(`.fontWeight(.medium)`);
      else if (w.includes('light')) textMods.push(`.fontWeight(.light)`);
    }

    if (varMap.has('letterSpacing')) {
      textMods.push(`.kerning(${getPlatformToken(varMap.get('letterSpacing')!, 'swiftui')})`);
    } else if (typeof typography.letterSpacing === 'number' && typography.letterSpacing !== 0) {
      textMods.push(`.kerning(${typography.letterSpacing})`);
    }

    if (varMap.has('fill')) {
      textMods.push(`.foregroundColor(${getPlatformToken(varMap.get('fill')!, 'swiftui')})`);
    } else {
      const fill = colors.find((c) => c.source === 'fill');
      if (fill) {
        textMods.push(`.foregroundColor(${toSwiftUiColor(fill.hex, fill.opacity)})`);
      }
    }
    return `Text("${data.name || 'Text'}")\n  ${textMods.join('\n  ')}`;
  }

  // 1. Sizing
  if (varMap.has('width') && varMap.has('height')) {
    modifiers.push(`.frame(width: ${getPlatformToken(varMap.get('width')!, 'swiftui')}, height: ${getPlatformToken(varMap.get('height')!, 'swiftui')})`);
  } else if (varMap.has('width')) {
    modifiers.push(`.frame(width: ${getPlatformToken(varMap.get('width')!, 'swiftui')}, height: ${Math.round(boxModel.height)})`);
  } else if (varMap.has('height')) {
    modifiers.push(`.frame(width: ${Math.round(boxModel.width)}, height: ${getPlatformToken(varMap.get('height')!, 'swiftui')})`);
  } else if (boxModel.width > 0 && boxModel.height > 0) {
    modifiers.push(`.frame(width: ${Math.round(boxModel.width)}, height: ${Math.round(boxModel.height)})`);
  } else if (boxModel.width > 0) {
    modifiers.push(`.frame(width: ${Math.round(boxModel.width)})`);
  } else if (boxModel.height > 0) {
    modifiers.push(`.frame(height: ${Math.round(boxModel.height)})`);
  }

  // 2. Padding
  const { paddingTop: pt, paddingRight: pr, paddingBottom: pb, paddingLeft: pl } = boxModel;
  if (varMap.has('padding')) {
    modifiers.push(`.padding(${getPlatformToken(varMap.get('padding')!, 'swiftui')})`);
  } else if (pt === pb && pr === pl && pt === pr && pt > 0) {
    modifiers.push(`.padding(${pt})`);
  } else if (pt === pb && pr === pl && (pt > 0 || pr > 0)) {
    if (pr > 0) modifiers.push(`.padding(.horizontal, ${pr})`);
    if (pt > 0) modifiers.push(`.padding(.vertical, ${pt})`);
  } else if (pt > 0 || pr > 0 || pb > 0 || pl > 0) {
    modifiers.push(`.padding(EdgeInsets(top: ${pt}, leading: ${pl}, bottom: ${pb}, trailing: ${pr}))`);
  }

  // 3. Background
  if (varMap.has('fill')) {
    modifiers.push(`.background(${getPlatformToken(varMap.get('fill')!, 'swiftui')})`);
  } else {
    const fill = colors.find((c) => c.source === 'fill');
    if (fill) {
      modifiers.push(`.background(${toSwiftUiColor(fill.hex, fill.opacity)})`);
    }
  }

  // 4. Corner Radius
  const { cornerRadius } = boxModel;
  let radius = 0;
  if (typeof cornerRadius === 'number') {
    radius = cornerRadius;
  } else if (Array.isArray(cornerRadius) && cornerRadius.length > 0) {
    radius = cornerRadius[0];
  }
  if (varMap.has('cornerRadius')) {
    modifiers.push(`.cornerRadius(${getPlatformToken(varMap.get('cornerRadius')!, 'swiftui')})`);
  } else if (radius > 0) {
    modifiers.push(`.cornerRadius(${radius})`);
  }

  // 5. Border
  if (border && border.strokeWeight > 0) {
    const borderCol = toSwiftUiColor(border.color, border.opacity ?? 1);
    if (radius > 0) {
      modifiers.push(`.overlay(RoundedRectangle(cornerRadius: ${radius}).stroke(${borderCol}, lineWidth: ${border.strokeWeight}))`);
    } else {
      modifiers.push(`.border(${borderCol}, width: ${border.strokeWeight})`);
    }
  }

  // 6. Shadows
  if (shadows && shadows.length > 0) {
    const s = shadows[0];
    const shadowCol = toSwiftUiColor(s.color, s.opacity);
    modifiers.push(`.shadow(color: ${shadowCol}, radius: ${s.blur}, x: ${s.offsetX}, y: ${s.offsetY})`);
  }

  // 7. Opacity
  if (typeof opacity === 'number' && opacity < 1) {
    modifiers.push(`.opacity(${opacity})`);
  }

  return modifiers.join('\n');
}
