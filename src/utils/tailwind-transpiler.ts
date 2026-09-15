import { NodeInspectionData } from '../types/messages';
import {
  toTailwindDimension,
  toTailwindFontSize,
  toTailwindFontWeight,
  toTailwindRadius,
} from './tailwind-scale';

export function transpileToTailwind(data: NodeInspectionData): string {
  const layoutClasses: string[] = [];
  const sizingClasses: string[] = [];
  const spacingClasses: string[] = [];
  const typographyClasses: string[] = [];
  const visualClasses: string[] = [];

  const { boxModel, layoutMode, primaryAxisAlign, counterAxisAlign, layoutGrow, typography, effects, colors, type } = data;

  // 1. Layout Mode (Flexbox)
  if (layoutMode === 'HORIZONTAL') {
    layoutClasses.push('flex', 'flex-row');
  } else if (layoutMode === 'VERTICAL') {
    layoutClasses.push('flex', 'flex-col');
  }

  if (layoutMode && layoutMode !== 'NONE') {
    // Primary axis alignment (justify)
    if (primaryAxisAlign === 'CENTER') {
      layoutClasses.push('justify-center');
    } else if (primaryAxisAlign === 'MAX') {
      layoutClasses.push('justify-end');
    } else if (primaryAxisAlign === 'SPACE_BETWEEN') {
      layoutClasses.push('justify-between');
    }

    // Counter axis alignment (items)
    if (counterAxisAlign === 'CENTER') {
      layoutClasses.push('items-center');
    } else if (counterAxisAlign === 'MAX') {
      layoutClasses.push('items-end');
    } else if (counterAxisAlign === 'BASELINE') {
      layoutClasses.push('items-baseline');
    }

    // Gap
    if (boxModel.gap > 0) {
      layoutClasses.push(toTailwindDimension(boxModel.gap, 'gap'));
    }
  }

  // 2. Sizing
  if (layoutGrow === 1) {
    sizingClasses.push('flex-1');
  }

  if (boxModel.width > 0) {
    sizingClasses.push(toTailwindDimension(boxModel.width, 'w'));
  }
  if (boxModel.height > 0) {
    sizingClasses.push(toTailwindDimension(boxModel.height, 'h'));
  }

  // 3. Spacing (Padding)
  const { paddingTop: pt, paddingRight: pr, paddingBottom: pb, paddingLeft: pl } = boxModel;
  const hasPadding = pt > 0 || pr > 0 || pb > 0 || pl > 0;

  if (hasPadding) {
    if (pt === pr && pr === pb && pb === pl) {
      spacingClasses.push(toTailwindDimension(pt, 'p'));
    } else if (pt === pb && pr === pl) {
      if (pr > 0) spacingClasses.push(toTailwindDimension(pr, 'px'));
      if (pt > 0) spacingClasses.push(toTailwindDimension(pt, 'py'));
    } else {
      if (pt > 0) spacingClasses.push(toTailwindDimension(pt, 'pt'));
      if (pr > 0) spacingClasses.push(toTailwindDimension(pr, 'pr'));
      if (pb > 0) spacingClasses.push(toTailwindDimension(pb, 'pb'));
      if (pl > 0) spacingClasses.push(toTailwindDimension(pl, 'pl'));
    }
  }

  // 4. Typography (for TEXT nodes)
  if (type === 'TEXT' || typography) {
    if (typography?.fontSize) {
      typographyClasses.push(toTailwindFontSize(typography.fontSize));
    }
    if (typography?.fontWeight) {
      typographyClasses.push(toTailwindFontWeight(typography.fontWeight));
    }
    if (typography?.textAlign) {
      const alignMap: Record<string, string> = {
        CENTER: 'text-center',
        RIGHT: 'text-right',
        JUSTIFIED: 'text-justify',
      };
      if (alignMap[typography.textAlign]) {
        typographyClasses.push(alignMap[typography.textAlign]);
      }
    }

    // Text color from fill
    const textFill = colors.find((c) => c.source === 'fill');
    if (textFill) {
      typographyClasses.push(`text-[${textFill.hex}]`);
    }
  }

  // 5. Visuals: Background, Border, Corner Radius, Effects
  if (type !== 'TEXT') {
    const bgFill = colors.find((c) => c.source === 'fill');
    if (bgFill) {
      visualClasses.push(`bg-[${bgFill.hex}]`);
    }
  }

  if (data.border) {
    const { strokeWeight, individualWeights, strokeStyle, color } = data.border;

    if (individualWeights) {
      const sides = [
        { side: 't', w: individualWeights.top },
        { side: 'r', w: individualWeights.right },
        { side: 'b', w: individualWeights.bottom },
        { side: 'l', w: individualWeights.left },
      ];
      for (const { side, w } of sides) {
        if (w > 0) {
          if (w === 1) visualClasses.push(`border-${side}`);
          else if ([2, 4, 8].includes(w)) visualClasses.push(`border-${side}-${w}`);
          else visualClasses.push(`border-${side}-[${w}px]`);
        }
      }
    } else if (strokeWeight > 0) {
      if (strokeWeight === 1) visualClasses.push('border');
      else if ([2, 4, 8].includes(strokeWeight)) visualClasses.push(`border-${strokeWeight}`);
      else visualClasses.push(`border-[${strokeWeight}px]`);
    }

    if (strokeStyle === 'dashed') {
      visualClasses.push('border-dashed');
    } else if (strokeStyle === 'dotted') {
      visualClasses.push('border-dotted');
    }

    visualClasses.push(`border-[${color}]`);
  } else {
    const stroke = colors.find((c) => c.source === 'stroke');
    if (stroke) {
      visualClasses.push('border', `border-[${stroke.hex}]`);
    }
  }

  // Corner radius
  if (typeof boxModel.cornerRadius === 'number') {
    if (boxModel.cornerRadius > 0) {
      visualClasses.push(toTailwindRadius(boxModel.cornerRadius));
    }
  } else if (Array.isArray(boxModel.cornerRadius)) {
    const [tl, tr, br, bl] = boxModel.cornerRadius;
    if (tl === tr && tr === br && br === bl) {
      if (tl > 0) visualClasses.push(toTailwindRadius(tl));
    } else {
      if (tl > 0) visualClasses.push(`rounded-tl-[${tl}px]`);
      if (tr > 0) visualClasses.push(`rounded-tr-[${tr}px]`);
      if (br > 0) visualClasses.push(`rounded-br-[${br}px]`);
      if (bl > 0) visualClasses.push(`rounded-bl-[${bl}px]`);
    }
  }

  // Effects
  if (effects?.hasDropShadow) {
    visualClasses.push('shadow-md');
  }

  const all = [
    ...layoutClasses,
    ...sizingClasses,
    ...spacingClasses,
    ...typographyClasses,
    ...visualClasses,
  ];

  return all.join(' ');
}
