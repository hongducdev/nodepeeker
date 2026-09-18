import { BoxModelData, NodeInspectionData, TypographyData, BorderData, ShadowData } from '../types/messages';
import { extractColorsFromNode, rgbToHex } from './color-utils';
import { resolveVideoTarget } from './video-frame';

export async function extractNodeData(node: SceneNode): Promise<NodeInspectionData> {
  const width = Math.round(('width' in node ? node.width : 0) * 100) / 100;
  const height = Math.round(('height' in node ? node.height : 0) * 100) / 100;
  const x = Math.round(('x' in node ? node.x : 0) * 100) / 100;
  const y = Math.round(('y' in node ? node.y : 0) * 100) / 100;

  let paddingTop = 0;
  let paddingRight = 0;
  let paddingBottom = 0;
  let paddingLeft = 0;
  let gap = 0;

  if ('paddingTop' in node && typeof node.paddingTop === 'number') {
    paddingTop = Math.round(node.paddingTop * 100) / 100;
    paddingRight = Math.round(node.paddingRight * 100) / 100;
    paddingBottom = Math.round(node.paddingBottom * 100) / 100;
    paddingLeft = Math.round(node.paddingLeft * 100) / 100;
  }

  if ('itemSpacing' in node && typeof node.itemSpacing === 'number') {
    gap = Math.round(node.itemSpacing * 100) / 100;
  }

  let cornerRadius: number | [number, number, number, number] = 0;
  if ('cornerRadius' in node) {
    if (typeof node.cornerRadius === 'number') {
      cornerRadius = Math.round(node.cornerRadius * 100) / 100;
    } else if (
      'topLeftRadius' in node &&
      typeof node.topLeftRadius === 'number'
    ) {
      cornerRadius = [
        Math.round(node.topLeftRadius * 100) / 100,
        Math.round(node.topRightRadius * 100) / 100,
        Math.round(node.bottomRightRadius * 100) / 100,
        Math.round(node.bottomLeftRadius * 100) / 100,
      ];
    }
  }

  const boxModel: BoxModelData = {
    width,
    height,
    x,
    y,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    gap,
    cornerRadius,
  };

  // The dimension fallback is also the result when Figma cannot produce CSS.
  let css: Record<string, string> = {
    width: `${width}px`,
    height: `${height}px`,
  };
  if ('getCSSAsync' in node && typeof node.getCSSAsync === 'function') {
    try {
      css = await node.getCSSAsync();
    } catch {
      // Keep the fallback.
    }
  }

  let layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL' = 'NONE';
  let primaryAxisAlign: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN' = 'MIN';
  let counterAxisAlign: 'MIN' | 'MAX' | 'CENTER' | 'BASELINE' = 'MIN';
  let layoutGrow = 0;
  let layoutAlign: 'STRETCH' | 'INHERIT' = 'INHERIT';

  if ('layoutMode' in node && typeof node.layoutMode === 'string') {
    layoutMode = node.layoutMode as 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  }
  if ('primaryAxisAlignItems' in node) {
    primaryAxisAlign = node.primaryAxisAlignItems as 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN';
  }
  if ('counterAxisAlignItems' in node) {
    counterAxisAlign = node.counterAxisAlignItems as 'MIN' | 'MAX' | 'CENTER' | 'BASELINE';
  }
  if ('layoutGrow' in node && typeof node.layoutGrow === 'number') {
    layoutGrow = node.layoutGrow;
  }
  if ('layoutAlign' in node && typeof node.layoutAlign === 'string') {
    layoutAlign = node.layoutAlign as 'STRETCH' | 'INHERIT';
  }

  let typography: TypographyData | undefined;
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    let family = 'Inter';
    let weight: string | number = 400;

    if (typeof textNode.fontName !== 'symbol') {
      family = textNode.fontName.family;
      weight = textNode.fontName.style;
    }

    const fontSize = typeof textNode.fontSize === 'number' ? textNode.fontSize : 16;
    let lineHeight: number | string | undefined;
    if (typeof textNode.lineHeight !== 'symbol') {
      if (textNode.lineHeight.unit === 'PIXELS') {
        lineHeight = `${Math.round(textNode.lineHeight.value)}px`;
      } else if (textNode.lineHeight.unit === 'PERCENT') {
        lineHeight = `${Math.round(textNode.lineHeight.value)}%`;
      }
    }

    let letterSpacing: number | string | undefined;
    if (typeof textNode.letterSpacing !== 'symbol') {
      if (textNode.letterSpacing.unit === 'PIXELS') {
        letterSpacing = `${Math.round(textNode.letterSpacing.value * 100) / 100}px`;
      } else if (textNode.letterSpacing.unit === 'PERCENT') {
        letterSpacing = `${Math.round(textNode.letterSpacing.value * 100) / 100}%`;
      }
    }

    typography = {
      fontFamily: family,
      fontWeight: weight,
      fontSize,
      lineHeight,
      letterSpacing,
      textAlign: textNode.textAlignHorizontal as 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED',
    };
  }

  const shadows: ShadowData[] = [];
  if ('effects' in node && Array.isArray(node.effects)) {
    for (const effect of node.effects) {
      if (effect.visible === false) continue;
      if (effect.type !== 'DROP_SHADOW' && effect.type !== 'INNER_SHADOW') continue;
      shadows.push({
        inner: effect.type === 'INNER_SHADOW',
        offsetX: Math.round(effect.offset.x * 100) / 100,
        offsetY: Math.round(effect.offset.y * 100) / 100,
        blur: Math.round(effect.radius * 100) / 100,
        spread: Math.round((effect.spread ?? 0) * 100) / 100,
        color: rgbToHex(effect.color.r, effect.color.g, effect.color.b),
        opacity: Math.round((typeof effect.color.a === 'number' ? effect.color.a : 1) * 100) / 100,
      });
    }
  }

  // Node opacity is independent of shadows; hoisting it avoids losing the value on
  // a translucent node that happens to have no shadow.
  const nodeOpacity =
    'opacity' in node && typeof node.opacity === 'number' ? Math.round(node.opacity * 100) / 100 : 1;

  let sizing: NodeInspectionData['sizing'];
  if (
    'primaryAxisSizingMode' in node &&
    typeof node.primaryAxisSizingMode === 'string' &&
    'counterAxisSizingMode' in node &&
    typeof node.counterAxisSizingMode === 'string'
  ) {
    const primaryHugs = node.primaryAxisSizingMode === 'AUTO';
    const counterHugs = node.counterAxisSizingMode === 'AUTO';
    // The primary axis is the layout direction, so it maps to a different physical
    // axis depending on orientation.
    sizing =
      layoutMode === 'VERTICAL'
        ? { hugHorizontal: counterHugs, hugVertical: primaryHugs }
        : { hugHorizontal: primaryHugs, hugVertical: counterHugs };
  }

  const position =
    'layoutPositioning' in node && node.layoutPositioning === 'ABSOLUTE'
      ? { absolute: true }
      : undefined;

  // Only frames Figma can actually encode get a video target; the UI gates on its presence,
  // so a static frame never offers an export that would fail.
  const videoTarget = await resolveVideoTarget(node);
  const video = videoTarget
    ? {
        frameId: videoTarget.frame.id,
        frameName: videoTarget.targetName || videoTarget.frame.name,
        durationSeconds: videoTarget.durationSeconds,
        initialFormat: videoTarget.initialFormat,
        isDirectMedia: videoTarget.isDirectMedia,
        hasVideoFill: videoTarget.hasVideoFill,
      }
    : undefined;

  const colors = extractColorsFromNode(node);
  let border: BorderData | undefined;
  if ('strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
    const visibleStroke = node.strokes.find((s) => s.visible !== false);
    if (visibleStroke) {
      let strokeColor = '#000000';
      if (visibleStroke.type === 'SOLID') {
        strokeColor = rgbToHex(
          visibleStroke.color.r,
          visibleStroke.color.g,
          visibleStroke.color.b
        );
      } else {
        const strokeToken = colors.find((c) => c.source === 'stroke');
        if (strokeToken) strokeColor = strokeToken.hex;
      }

      let uniformWeight = 0;
      if ('strokeWeight' in node && typeof node.strokeWeight === 'number') {
        uniformWeight = Math.round(node.strokeWeight * 100) / 100;
      }

      let individualWeights: BorderData['individualWeights'];
      if (
        'strokeTopWeight' in node &&
        typeof node.strokeTopWeight === 'number' &&
        'strokeRightWeight' in node &&
        typeof node.strokeRightWeight === 'number' &&
        'strokeBottomWeight' in node &&
        typeof node.strokeBottomWeight === 'number' &&
        'strokeLeftWeight' in node &&
        typeof node.strokeLeftWeight === 'number'
      ) {
        const top = Math.round(node.strokeTopWeight * 100) / 100;
        const right = Math.round(node.strokeRightWeight * 100) / 100;
        const bottom = Math.round(node.strokeBottomWeight * 100) / 100;
        const left = Math.round(node.strokeLeftWeight * 100) / 100;

        if (top !== right || right !== bottom || bottom !== left) {
          individualWeights = { top, right, bottom, left };
        } else if (uniformWeight === 0 && top > 0) {
          uniformWeight = top;
        }
      }

      if (uniformWeight === 0 && !individualWeights) {
        uniformWeight = 1;
      }

      let strokeStyle: 'solid' | 'dashed' | 'dotted' = 'solid';
      let dashPattern: number[] | undefined;
      if ('dashPattern' in node && Array.isArray(node.dashPattern) && node.dashPattern.length > 0) {
        dashPattern = Array.from(node.dashPattern);
        if (dashPattern.length === 2 && dashPattern[0] <= 2 && dashPattern[1] > dashPattern[0]) {
          strokeStyle = 'dotted';
        } else {
          strokeStyle = 'dashed';
        }
      }

      let strokeAlign: 'INSIDE' | 'OUTSIDE' | 'CENTER' = 'INSIDE';
      if ('strokeAlign' in node && typeof node.strokeAlign === 'string') {
        strokeAlign = node.strokeAlign as 'INSIDE' | 'OUTSIDE' | 'CENTER';
      }

      border = {
        strokeWeight: uniformWeight,
        individualWeights,
        strokeAlign,
        strokeStyle,
        dashPattern,
        color: strokeColor,
      };

      if (individualWeights) {
        if (individualWeights.top > 0) css['border-top'] = `${individualWeights.top}px ${strokeStyle} ${strokeColor}`;
        if (individualWeights.right > 0) css['border-right'] = `${individualWeights.right}px ${strokeStyle} ${strokeColor}`;
        if (individualWeights.bottom > 0) css['border-bottom'] = `${individualWeights.bottom}px ${strokeStyle} ${strokeColor}`;
        if (individualWeights.left > 0) css['border-left'] = `${individualWeights.left}px ${strokeStyle} ${strokeColor}`;
      } else if (uniformWeight > 0) {
        css['border'] = `${uniformWeight}px ${strokeStyle} ${strokeColor}`;
      }
    }
  }





  return {
    id: node.id,
    name: node.name,
    type: node.type,
    css,
    colors,
    boxModel,
    layoutMode,
    primaryAxisAlign,
    counterAxisAlign,
    layoutGrow,
    layoutAlign,
    typography,
    border,
    opacity: nodeOpacity === 1 ? undefined : nodeOpacity,
    shadows: shadows.length > 0 ? shadows : undefined,
    sizing,
    position,
    video,
  };
}
