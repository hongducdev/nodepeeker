import type { NodeInspectionData } from '../../types/messages';
import { toHex8 } from '../color';

export function transpileToReactNative(data: NodeInspectionData): string {
  const styles: string[] = [];
  const { boxModel, layoutMode, primaryAxisAlign, counterAxisAlign, sizing, position, border, shadows, opacity, typography, colors } = data;

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

  if (boxModel.gap > 0) {
    styles.push(`  gap: ${boxModel.gap},`);
  }

  // 2. Sizing
  if (!sizing?.hugHorizontal && boxModel.width > 0) {
    styles.push(`  width: ${Math.round(boxModel.width)},`);
  }
  if (!sizing?.hugVertical && boxModel.height > 0) {
    styles.push(`  height: ${Math.round(boxModel.height)},`);
  }

  // 3. Spacing (Padding)
  const { paddingTop: pt, paddingRight: pr, paddingBottom: pb, paddingLeft: pl } = boxModel;
  if (pt === pb && pr === pl && pt === pr && pt > 0) {
    styles.push(`  padding: ${pt},`);
  } else if (pt === pb && pr === pl && (pt > 0 || pr > 0)) {
    if (pt > 0) styles.push(`  paddingVertical: ${pt},`);
    if (pr > 0) styles.push(`  paddingHorizontal: ${pr},`);
  } else {
    if (pt > 0) styles.push(`  paddingTop: ${pt},`);
    if (pr > 0) styles.push(`  paddingRight: ${pr},`);
    if (pb > 0) styles.push(`  paddingBottom: ${pb},`);
    if (pl > 0) styles.push(`  paddingLeft: ${pl},`);
  }

  // 4. Background & Colors
  const fill = colors.find((c) => c.source === 'fill');
  if (fill) {
    const bg = fill.opacity < 1 ? toHex8(fill.hex, fill.opacity) : fill.hex;
    if (data.type === 'TEXT') {
      styles.push(`  color: '${bg}',`);
    } else {
      styles.push(`  backgroundColor: '${bg}',`);
    }
  }

  // 5. Border & Corner Radius
  if (border && border.strokeWeight > 0) {
    const borderCol = border.opacity !== undefined && border.opacity < 1
      ? toHex8(border.color, border.opacity)
      : border.color;
    styles.push(`  borderWidth: ${border.strokeWeight},`);
    styles.push(`  borderColor: '${borderCol}',`);
    if (border.strokeStyle === 'dashed') {
      styles.push(`  borderStyle: 'dashed',`);
    } else if (border.strokeStyle === 'dotted') {
      styles.push(`  borderStyle: 'dotted',`);
    }
  }

  const { cornerRadius } = boxModel;
  if (typeof cornerRadius === 'number' && cornerRadius > 0) {
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
    if (typography.fontSize) styles.push(`  fontSize: ${typography.fontSize},`);
    if (typography.fontFamily) styles.push(`  fontFamily: '${typography.fontFamily}',`);
    if (typography.fontWeight) {
      styles.push(`  fontWeight: '${String(typography.fontWeight)}',`);
    }
    if (typeof typography.lineHeight === 'number') {
      styles.push(`  lineHeight: ${Math.round(typography.lineHeight)},`);
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
