import type { NodeInspectionData } from '../../types/messages';
import { toArgbColor } from '../color';

export function transpileToFlutter(data: NodeInspectionData): string {
  const { boxModel, border, shadows, opacity, typography, colors, type } = data;

  if (type === 'TEXT' && typography) {
    const textParams: string[] = [];
    if (typography.fontSize) textParams.push(`  fontSize: ${typography.fontSize},`);
    if (typography.fontFamily) textParams.push(`  fontFamily: '${typography.fontFamily}',`);
    if (typography.fontWeight) {
      const w = String(typography.fontWeight);
      const weightNum = w.replace(/\D/g, '') || (w.toLowerCase().includes('bold') ? '700' : '400');
      textParams.push(`  fontWeight: FontWeight.w${weightNum},`);
    }
    const fill = colors.find((c) => c.source === 'fill');
    if (fill) {
      textParams.push(`  color: const ${toArgbColor(fill.hex, fill.opacity)},`);
    }
    return `const TextStyle(\n${textParams.join('\n')}\n);`;
  }

  const containerParams: string[] = [];

  // 1. Dimensions
  if (boxModel.width > 0) containerParams.push(`  width: ${Math.round(boxModel.width)},`);
  if (boxModel.height > 0) containerParams.push(`  height: ${Math.round(boxModel.height)},`);

  // 2. Padding
  const { paddingTop: pt, paddingRight: pr, paddingBottom: pb, paddingLeft: pl } = boxModel;
  if (pt === pb && pr === pl && pt === pr && pt > 0) {
    containerParams.push(`  padding: const EdgeInsets.all(${pt}),`);
  } else if (pt === pb && pr === pl && (pt > 0 || pr > 0)) {
    const parts: string[] = [];
    if (pr > 0) parts.push(`horizontal: ${pr}`);
    if (pt > 0) parts.push(`vertical: ${pt}`);
    containerParams.push(`  padding: const EdgeInsets.symmetric(${parts.join(', ')}),`);
  } else if (pt > 0 || pr > 0 || pb > 0 || pl > 0) {
    const parts: string[] = [];
    if (pl > 0) parts.push(`left: ${pl}`);
    if (pt > 0) parts.push(`top: ${pt}`);
    if (pr > 0) parts.push(`right: ${pr}`);
    if (pb > 0) parts.push(`bottom: ${pb}`);
    containerParams.push(`  padding: const EdgeInsets.only(${parts.join(', ')}),`);
  }

  // 3. Decoration (Background, Border, Radius, Shadows)
  const decorParams: string[] = [];
  const fill = colors.find((c) => c.source === 'fill');
  if (fill) {
    decorParams.push(`    color: const ${toArgbColor(fill.hex, fill.opacity)},`);
  }

  const { cornerRadius } = boxModel;
  if (typeof cornerRadius === 'number' && cornerRadius > 0) {
    decorParams.push(`    borderRadius: BorderRadius.circular(${cornerRadius}),`);
  } else if (Array.isArray(cornerRadius)) {
    const [tl, tr, br, bl] = cornerRadius;
    const parts: string[] = [];
    if (tl > 0) parts.push(`topLeft: Radius.circular(${tl})`);
    if (tr > 0) parts.push(`topRight: Radius.circular(${tr})`);
    if (br > 0) parts.push(`bottomRight: Radius.circular(${br})`);
    if (bl > 0) parts.push(`bottomLeft: Radius.circular(${bl})`);
    if (parts.length > 0) {
      decorParams.push(`    borderRadius: const BorderRadius.only(${parts.join(', ')}),`);
    }
  }

  if (border && border.strokeWeight > 0) {
    const borderCol = toArgbColor(border.color, border.opacity ?? 1);
    decorParams.push(`    border: Border.all(color: const ${borderCol}, width: ${border.strokeWeight}),`);
  }

  if (shadows && shadows.length > 0) {
    const shadowItems = shadows.map((s) => {
      const col = toArgbColor(s.color, s.opacity);
      return `      BoxShadow(\n        color: const ${col},\n        offset: const Offset(${s.offsetX}, ${s.offsetY}),\n        blurRadius: ${s.blur},\n      ),`;
    });
    decorParams.push(`    boxShadow: [\n${shadowItems.join('\n')}\n    ],`);
  }

  if (decorParams.length > 0) {
    containerParams.push(`  decoration: BoxDecoration(\n${decorParams.join('\n')}\n  ),`);
  }

  let code = `Container(\n${containerParams.join('\n')}\n)`;
  if (typeof opacity === 'number' && opacity < 1) {
    code = `Opacity(\n  opacity: ${opacity},\n  child: ${code},\n)`;
  }

  return code;
}
