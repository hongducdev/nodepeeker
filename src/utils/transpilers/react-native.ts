import type { NodeInspectionData, BoundVariableToken } from '../../types/messages.js';
import { toHex8 } from '../color.js';
import { getPlatformToken } from './token-utils.js';

export function transpileToReactNative(
  data: NodeInspectionData,
  options?: { useTokens?: boolean }
): string {
  const styles: string[] = [];
  const { boxModel, layoutMode, primaryAxisAlign, counterAxisAlign, sizing, position, border, shadows, opacity, typography, colors } = data;

  const useTokens = Boolean(options?.useTokens && data.variables && data.variables.length > 0);
  const varMap = new Map<string, BoundVariableToken>();
  if (useTokens && data.variables) {
    for (const v of data.variables) {
      varMap.set(v.field, v);
    }
  }

  // 1. Layout & Flexbox
  if (position?.absolute) {
    styles.push(`  position: 'absolute',`);
    if (boxModel.x !== 0) styles.push(`  left: ${Math.round(boxModel.x)},`);
    if (boxModel.y !== 0) styles.push(`  top: ${Math.round(boxModel.y)},`);
  }

  if (layoutMode === 'HORIZONTAL') {
    styles.push(`  flexDirection: 'row',`);
  } else if (layoutMode === 'VERTICAL') {
    styles.push(`  flexDirection: 'column',`);
  }

  if (primaryAxisAlign) {
    const justifyMap: Record<string, string> = {
      MIN: "'flex-start'",
      MAX: "'flex-end'",
      CENTER: "'center'",
      SPACE_BETWEEN: "'space-between'",
    };
    if (justifyMap[primaryAxisAlign]) {
      styles.push(`  justifyContent: ${justifyMap[primaryAxisAlign]},`);
    }
  }

  if (counterAxisAlign) {
    const alignMap: Record<string, string> = {
      MIN: "'flex-start'",
      MAX: "'flex-end'",
      CENTER: "'center'",
      BASELINE: "'baseline'",
    };
    if (alignMap[counterAxisAlign]) {
      styles.push(`  alignItems: ${alignMap[counterAxisAlign]},`);
    }
  }

  if (boxModel.gap > 0 || varMap.has('itemSpacing')) {
    if (varMap.has('itemSpacing')) {
      styles.push(`  gap: ${getPlatformToken(varMap.get('itemSpacing')!, 'react-native')},`);
    } else {
      styles.push(`  gap: ${boxModel.gap},`);
    }
  }

  // 2. Sizing
  if (!sizing?.hugHorizontal && (boxModel.width > 0 || varMap.has('width'))) {
    if (varMap.has('width')) {
      styles.push(`  width: ${getPlatformToken(varMap.get('width')!, 'react-native')},`);
    } else {
      styles.push(`  width: ${Math.round(boxModel.width)},`);
    }
  }
  if (!sizing?.hugVertical && (boxModel.height > 0 || varMap.has('height'))) {
    if (varMap.has('height')) {
      styles.push(`  height: ${getPlatformToken(varMap.get('height')!, 'react-native')},`);
    } else {
      styles.push(`  height: ${Math.round(boxModel.height)},`);
    }
  }

  // 3. Spacing (Padding)
  const { paddingTop: pt, paddingRight: pr, paddingBottom: pb, paddingLeft: pl } = boxModel;
  if (varMap.has('padding')) {
    styles.push(`  padding: ${getPlatformToken(varMap.get('padding')!, 'react-native')},`);
  } else if (pt === pb && pr === pl && pt === pr && pt > 0) {
    if (varMap.has('paddingTop')) {
      styles.push(`  padding: ${getPlatformToken(varMap.get('paddingTop')!, 'react-native')},`);
    } else {
      styles.push(`  padding: ${pt},`);
    }
  } else if (pt === pb && pr === pl && (pt > 0 || pr > 0)) {
    if (pt > 0) {
      styles.push(
        `  paddingVertical: ${varMap.has('paddingTop') ? getPlatformToken(varMap.get('paddingTop')!, 'react-native') : pt},`
      );
    }
    if (pr > 0) {
      styles.push(
        `  paddingHorizontal: ${varMap.has('paddingRight') ? getPlatformToken(varMap.get('paddingRight')!, 'react-native') : pr},`
      );
    }
  } else {
    if (pt > 0 || varMap.has('paddingTop')) {
      styles.push(`  paddingTop: ${varMap.has('paddingTop') ? getPlatformToken(varMap.get('paddingTop')!, 'react-native') : pt},`);
    }
    if (pr > 0 || varMap.has('paddingRight')) {
      styles.push(`  paddingRight: ${varMap.has('paddingRight') ? getPlatformToken(varMap.get('paddingRight')!, 'react-native') : pr},`);
    }
    if (pb > 0 || varMap.has('paddingBottom')) {
      styles.push(`  paddingBottom: ${varMap.has('paddingBottom') ? getPlatformToken(varMap.get('paddingBottom')!, 'react-native') : pb},`);
    }
    if (pl > 0 || varMap.has('paddingLeft')) {
      styles.push(`  paddingLeft: ${varMap.has('paddingLeft') ? getPlatformToken(varMap.get('paddingLeft')!, 'react-native') : pl},`);
    }
  }

  // 4. Background & Colors
  if (varMap.has('fill')) {
    const fillTok = getPlatformToken(varMap.get('fill')!, 'react-native');
    if (data.type === 'TEXT') {
      styles.push(`  color: ${fillTok},`);
    } else {
      styles.push(`  backgroundColor: ${fillTok},`);
    }
  } else {
    const fill = colors.find((c) => c.source === 'fill');
    if (fill) {
      const bg = fill.opacity < 1 ? toHex8(fill.hex, fill.opacity) : fill.hex;
      if (data.type === 'TEXT') {
        styles.push(`  color: '${bg}',`);
      } else {
        styles.push(`  backgroundColor: '${bg}',`);
      }
    }
  }

  // 5. Border & Corner Radius
  if (border && border.strokeWeight > 0) {
    if (varMap.has('strokeWeight')) {
      styles.push(`  borderWidth: ${getPlatformToken(varMap.get('strokeWeight')!, 'react-native')},`);
    } else {
      styles.push(`  borderWidth: ${border.strokeWeight},`);
    }

    if (varMap.has('stroke')) {
      styles.push(`  borderColor: ${getPlatformToken(varMap.get('stroke')!, 'react-native')},`);
    } else {
      const borderCol = border.opacity !== undefined && border.opacity < 1
        ? toHex8(border.color, border.opacity)
        : border.color;
      styles.push(`  borderColor: '${borderCol}',`);
    }

    if (border.strokeStyle === 'dashed') {
      styles.push(`  borderStyle: 'dashed',`);
    } else if (border.strokeStyle === 'dotted') {
      styles.push(`  borderStyle: 'dotted',`);
    }
  }

  const { cornerRadius } = boxModel;
  if (varMap.has('cornerRadius')) {
    styles.push(`  borderRadius: ${getPlatformToken(varMap.get('cornerRadius')!, 'react-native')},`);
  } else if (typeof cornerRadius === 'number' && cornerRadius > 0) {
    styles.push(`  borderRadius: ${cornerRadius},`);
  } else if (Array.isArray(cornerRadius)) {
    const [tl, tr, br, bl] = cornerRadius;
    if (tl > 0) styles.push(`  borderTopLeftRadius: ${tl},`);
    if (tr > 0) styles.push(`  borderTopRightRadius: ${tr},`);
    if (br > 0) styles.push(`  borderBottomRightRadius: ${br},`);
    if (bl > 0) styles.push(`  borderBottomLeftRadius: ${bl},`);
  }

  // 6. Typography
  if (typography) {
    if (varMap.has('fontSize')) {
      styles.push(`  fontSize: ${getPlatformToken(varMap.get('fontSize')!, 'react-native')},`);
    } else if (typography.fontSize) {
      styles.push(`  fontSize: ${typography.fontSize},`);
    }

    if (varMap.has('fontFamily')) {
      styles.push(`  fontFamily: ${getPlatformToken(varMap.get('fontFamily')!, 'react-native')},`);
    } else if (typography.fontFamily) {
      styles.push(`  fontFamily: '${typography.fontFamily}',`);
    }

    if (varMap.has('fontWeight')) {
      styles.push(`  fontWeight: ${getPlatformToken(varMap.get('fontWeight')!, 'react-native')},`);
    } else if (typography.fontWeight) {
      styles.push(`  fontWeight: '${String(typography.fontWeight)}',`);
    }

    if (varMap.has('lineHeight')) {
      styles.push(`  lineHeight: ${getPlatformToken(varMap.get('lineHeight')!, 'react-native')},`);
    } else if (typeof typography.lineHeight === 'number') {
      styles.push(`  lineHeight: ${Math.round(typography.lineHeight)},`);
    }

    if (varMap.has('letterSpacing')) {
      styles.push(`  letterSpacing: ${getPlatformToken(varMap.get('letterSpacing')!, 'react-native')},`);
    } else if (typeof typography.letterSpacing === 'number' && typography.letterSpacing !== 0) {
      styles.push(`  letterSpacing: ${typography.letterSpacing},`);
    }

    if (typography.textAlign) {
      styles.push(`  textAlign: '${typography.textAlign.toLowerCase()}',`);
    }
  }

  // 7. Shadows & Opacity
  if (shadows && shadows.length > 0) {
    const s = shadows[0];
    styles.push(`  shadowColor: '${s.color}',`);
    styles.push(`  shadowOffset: { width: ${s.offsetX}, height: ${s.offsetY} },`);
    styles.push(`  shadowOpacity: ${s.opacity},`);
    styles.push(`  shadowRadius: ${s.blur},`);
    styles.push(`  elevation: ${Math.max(1, Math.round(s.blur / 2))},`);
  }

  if (typeof opacity === 'number' && opacity < 1) {
    styles.push(`  opacity: ${opacity},`);
  }

  return `const styles = StyleSheet.create({\n  container: {\n${styles.join('\n')}\n  },\n});`;
}
