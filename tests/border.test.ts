import { describe, it, expect } from 'vitest';
import { transpileToTailwind } from '../src/utils/tailwind-transpiler';
import { NodeInspectionData } from '../src/types/messages';

describe('border extraction and styling in code', () => {
  it('generates uniform border with custom width, style, and color in Tailwind', () => {
    const nodeData: NodeInspectionData = {
      id: 'border-1',
      name: 'Dashed Card',
      type: 'FRAME',
      css: {},
      colors: [{ hex: '#3B82F6', rgba: 'rgba(59, 130, 246, 1)', hsl: 'hsl(217, 91%, 60%)', opacity: 1, source: 'stroke' }],
      boxModel: {
        width: 200,
        height: 100,
        x: 0,
        y: 0,
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        gap: 0,
        cornerRadius: 0,
      },
      border: {
        strokeWeight: 2,
        strokeStyle: 'dashed',
        color: '#3B82F6',
      },
    };

    const tailwind = transpileToTailwind(nodeData);
    expect(tailwind).toContain('border-2');
    expect(tailwind).toContain('border-dashed');
    expect(tailwind).toContain('border-[#3B82F6]');
  });

  it('generates individual side borders (e.g. bottom border only)', () => {
    const nodeData: NodeInspectionData = {
      id: 'border-2',
      name: 'Bottom Border Item',
      type: 'FRAME',
      css: {},
      colors: [{ hex: '#E2E8F0', rgba: 'rgba(226, 232, 240, 1)', hsl: 'hsl(214, 32%, 91%)', opacity: 1, source: 'stroke' }],
      boxModel: {
        width: 300,
        height: 50,
        x: 0,
        y: 0,
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        gap: 0,
        cornerRadius: 0,
      },
      border: {
        strokeWeight: 0,
        individualWeights: {
          top: 0,
          right: 0,
          bottom: 1,
          left: 0,
        },
        strokeStyle: 'solid',
        color: '#E2E8F0',
      },
    };

    const tailwind = transpileToTailwind(nodeData);
    expect(tailwind).toContain('border-b');
    expect(tailwind).toContain('border-[#E2E8F0]');
    expect(tailwind).not.toContain('border-t');
  });

  it('generates arbitrary stroke weights like 3px or 5px in Tailwind', () => {
    const nodeData: NodeInspectionData = {
      id: 'border-3',
      name: 'Thick Border Frame',
      type: 'FRAME',
      css: {},
      colors: [{ hex: '#10B981', rgba: 'rgba(16, 185, 129, 1)', hsl: 'hsl(161, 84%, 39%)', opacity: 1, source: 'stroke' }],
      boxModel: {
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        gap: 0,
        cornerRadius: 0,
      },
      border: {
        strokeWeight: 3,
        strokeStyle: 'dotted',
        color: '#10B981',
      },
    };

    const tailwind = transpileToTailwind(nodeData);
    expect(tailwind).toContain('border-[3px]');
    expect(tailwind).toContain('border-dotted');
    expect(tailwind).toContain('border-[#10B981]');
  });
});
