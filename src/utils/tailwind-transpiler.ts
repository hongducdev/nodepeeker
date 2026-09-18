import { NodeInspectionData } from '../types/messages';
import {
  toTailwindDimension,
  toTailwindFontSize,
  toTailwindFontWeight,
  toTailwindLetterSpacing,
  toTailwindLineHeight,
  toTailwindOpacity,
  toTailwindRadius,
  toTailwindShadow,
} from './tailwind-scale';

// `MIN` is the flex default, so it has no class and is absent from both maps.
const JUSTIFY: Record<string, string> = {
  CENTER: 'justify-center',
  MAX: 'justify-end',
  SPACE_BETWEEN: 'justify-between',
};

const ALIGN_ITEMS: Record<string, string> = {
  CENTER: 'items-center',
  MAX: 'items-end',
  BASELINE: 'items-baseline',
};

const TEXT_ALIGN: Record<string, string> = {
  CENTER: 'text-center',
  RIGHT: 'text-right',
  JUSTIFIED: 'text-justify',
};

const BORDER_WIDTH_SCALE = [2, 4, 8];

/** Tailwind's named border widths; `side` is '' for all sides, else 't'/'r'/'b'/'l'. */
function borderWidthClass(weight: number, side = ''): string {
  const suffix = side ? `-${side}` : '';
  if (weight === 1) return `border${suffix}`;
  return BORDER_WIDTH_SCALE.includes(weight)
    ? `border${suffix}-${weight}`
    : `border${suffix}-[${weight}px]`;
}

export function transpileToTailwind(data: NodeInspectionData): string {
  const layoutClasses: string[] = [];
  const sizingClasses: string[] = [];
  const spacingClasses: string[] = [];
  const typographyClasses: string[] = [];
  const visualClasses: string[] = [];

  const {
    boxModel,
    layoutMode,
    primaryAxisAlign,
    counterAxisAlign,
    layoutGrow,
    layoutAlign,
    typography,
    shadows,
    sizing,
    position,
    opacity,
    colors,
    type,
  } = data;

  // 1. Layout Mode (Flexbox)
  if (layoutMode === 'HORIZONTAL') {
    layoutClasses.push('flex', 'flex-row');
  } else if (layoutMode === 'VERTICAL') {
    layoutClasses.push('flex', 'flex-col');
  }

  if (layoutMode && layoutMode !== 'NONE') {
    const justify = primaryAxisAlign && JUSTIFY[primaryAxisAlign];
    if (justify) layoutClasses.push(justify);

    const items = counterAxisAlign && ALIGN_ITEMS[counterAxisAlign];
    if (items) layoutClasses.push(items);

    if (boxModel.gap > 0) {
      layoutClasses.push(toTailwindDimension(boxModel.gap, 'gap'));
    }
  }

  // 2. Sizing
  if (position?.absolute) {
    layoutClasses.push('absolute');
    layoutClasses.push(`left-[${boxModel.x}px]`, `top-[${boxModel.y}px]`);
  }

  if (layoutGrow === 1) {
    sizingClasses.push('flex-1');
  }
  // Auto-layout "Fill container" on the counter axis.
  if (layoutAlign === 'STRETCH') {
    sizingClasses.push('self-stretch');
  }
  // Auto-layout "Hug contents" replaces explicit dimensions on that axis.
  if (sizing?.hugHorizontal) {
    sizingClasses.push('w-fit');
  } else if (boxModel.width > 0) {
    sizingClasses.push(toTailwindDimension(boxModel.width, 'w'));
  }
  if (sizing?.hugVertical) {
    sizingClasses.push('h-fit');
  } else if (boxModel.height > 0) {
    sizingClasses.push(toTailwindDimension(boxModel.height, 'h'));
  }

  // 3. Spacing (Padding)
  const { paddingTop: pt, paddingRight: pr, paddingBottom: pb, paddingLeft: pl } = boxModel;

  if (pt === pr && pr === pb && pb === pl) {
    if (pt > 0) spacingClasses.push(toTailwindDimension(pt, 'p'));
  } else if (pt === pb && pr === pl) {
    if (pr > 0) spacingClasses.push(toTailwindDimension(pr, 'px'));
    if (pt > 0) spacingClasses.push(toTailwindDimension(pt, 'py'));
  } else {
    if (pt > 0) spacingClasses.push(toTailwindDimension(pt, 'pt'));
    if (pr > 0) spacingClasses.push(toTailwindDimension(pr, 'pr'));
    if (pb > 0) spacingClasses.push(toTailwindDimension(pb, 'pb'));
    if (pl > 0) spacingClasses.push(toTailwindDimension(pl, 'pl'));
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
      const align = TEXT_ALIGN[typography.textAlign];
      if (align) typographyClasses.push(align);
    }

    // Text color from fill
    const textFill = colors.find((c) => c.source === 'fill');
    if (textFill) {
      const opacitySuffix = textFill.opacity < 1 ? `/${Math.round(textFill.opacity * 100)}` : '';
      typographyClasses.push(`text-[${textFill.hex}]${opacitySuffix}`);
    }

    const leading = toTailwindLineHeight(typography?.lineHeight);
    if (leading) typographyClasses.push(leading);

    const tracking = toTailwindLetterSpacing(typography?.letterSpacing);
    if (tracking) typographyClasses.push(tracking);
  }

  // 5. Visuals: Background, Border, Corner Radius, Effects
  if (type !== 'TEXT') {
    const bgFill = colors.find((c) => c.source === 'fill');
    if (bgFill) {
      const opacitySuffix = bgFill.opacity < 1 ? `/${Math.round(bgFill.opacity * 100)}` : '';
      visualClasses.push(`bg-[${bgFill.hex}]${opacitySuffix}`);
    }
  }

  if (data.border) {
    const { strokeWeight, individualWeights, strokeStyle, color } = data.border;

    if (individualWeights) {
      const sides: Array<[string, number]> = [
        ['t', individualWeights.top],
        ['r', individualWeights.right],
        ['b', individualWeights.bottom],
        ['l', individualWeights.left],
      ];
      for (const [side, w] of sides) {
        if (w > 0) visualClasses.push(borderWidthClass(w, side));
      }
    } else if (strokeWeight > 0) {
      visualClasses.push(borderWidthClass(strokeWeight));
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
      const opacitySuffix = stroke.opacity < 1 ? `/${Math.round(stroke.opacity * 100)}` : '';
      visualClasses.push('border', `border-[${stroke.hex}]${opacitySuffix}`);
    }
  }

  // Corner radius
  const { cornerRadius } = boxModel;
  if (typeof cornerRadius === 'number') {
    if (cornerRadius > 0) {
      visualClasses.push(toTailwindRadius(cornerRadius));
    }
  } else if (Array.isArray(cornerRadius)) {
    const [tl, tr, br, bl] = cornerRadius;
    if (tl === tr && tr === br && br === bl) {
      if (tl > 0) visualClasses.push(toTailwindRadius(tl));
    } else {
      if (tl > 0) visualClasses.push(`rounded-tl-[${tl}px]`);
      if (tr > 0) visualClasses.push(`rounded-tr-[${tr}px]`);
      if (br > 0) visualClasses.push(`rounded-br-[${br}px]`);
      if (bl > 0) visualClasses.push(`rounded-bl-[${bl}px]`);
    }
  }

  // Effects: real shadows, emitted verbatim.
  if (shadows) {
    const shadowClass = toTailwindShadow(shadows);
    if (shadowClass) visualClasses.push(shadowClass);
  }

  if (opacity !== undefined) {
    const opacityClass = toTailwindOpacity(opacity);
    if (opacityClass) visualClasses.push(opacityClass);
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
