import { BoxModelData, NodeInspectionData, TypographyData } from '../types/messages';
import { extractColorsFromNode, uint8ArrayToString } from './color-utils';

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

  let css: Record<string, string> = {};
  if ('getCSSAsync' in node && typeof node.getCSSAsync === 'function') {
    try {
      css = await node.getCSSAsync();
    } catch {
      css = {
        width: `${width}px`,
        height: `${height}px`,
      };
    }
  } else {
    css = {
      width: `${width}px`,
      height: `${height}px`,
    };
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

  let effects: NodeInspectionData['effects'];
  if ('effects' in node && Array.isArray(node.effects)) {
    const dropShadow = node.effects.find((e) => e.type === 'DROP_SHADOW' && e.visible !== false);
    if (dropShadow) {
      effects = {
        hasDropShadow: true,
        shadowType: 'md',
        opacity: 'opacity' in node && typeof node.opacity === 'number' ? node.opacity : 1,
      };
    }
  }

  const colors = extractColorsFromNode(node);
  let svg: string | undefined;
  if ('exportAsync' in node && typeof node.exportAsync === 'function') {
    try {
      const bytes = await node.exportAsync({ format: 'SVG' });
      svg = uint8ArrayToString(bytes);
    } catch {
      // ignore export failure
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
    effects,
    svg,
  };
}
