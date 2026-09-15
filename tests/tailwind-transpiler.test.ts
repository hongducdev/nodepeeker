import { describe, it, expect } from 'vitest';
import { transpileToTailwind } from '../src/utils/tailwind-transpiler';
import { NodeInspectionData } from '../src/types/messages';

describe('tailwind-transpiler', () => {
  it('transpiles a button component accurately', () => {
    const buttonData: NodeInspectionData = {
      id: 'btn-1',
      name: 'Primary Button',
      type: 'FRAME',
      css: {},
      colors: [
        { hex: '#2563EB', rgba: 'rgba(37, 99, 235, 1)', hsl: 'hsl(221, 83%, 53%)', opacity: 1, source: 'fill' },
      ],
      boxModel: {
        width: 120,
        height: 40,
        x: 0,
        y: 0,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
        gap: 8,
        cornerRadius: 8,
      },
      layoutMode: 'HORIZONTAL',
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
    };

    const result = transpileToTailwind(buttonData);
    expect(result).toContain('flex flex-row');
    expect(result).toContain('justify-center');
    expect(result).toContain('items-center');
    expect(result).toContain('gap-2');
    expect(result).toContain('px-4 py-2');
    expect(result).toContain('bg-[#2563EB]');
    expect(result).toContain('rounded-lg');
  });

  it('transpiles a card container with vertical auto-layout', () => {
    const cardData: NodeInspectionData = {
      id: 'card-1',
      name: 'Product Card',
      type: 'FRAME',
      css: {},
      colors: [
        { hex: '#FFFFFF', rgba: 'rgba(255, 255, 255, 1)', hsl: 'hsl(0, 0%, 100%)', opacity: 1, source: 'fill' },
        { hex: '#E2E8F0', rgba: 'rgba(226, 232, 240, 1)', hsl: 'hsl(214, 32%, 91%)', opacity: 1, source: 'stroke' },
      ],
      boxModel: {
        width: 320,
        height: 240,
        x: 100,
        y: 100,
        paddingTop: 24,
        paddingBottom: 24,
        paddingLeft: 24,
        paddingRight: 24,
        gap: 16,
        cornerRadius: 16,
      },
      layoutMode: 'VERTICAL',
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'MIN',
      shadows: [
        {
          inner: false,
          offsetX: 0,
          offsetY: 1,
          blur: 3,
          spread: 0,
          color: '#000000',
          opacity: 0.1,
        },
      ],
    };

    const result = transpileToTailwind(cardData);
    expect(result).toContain('flex flex-col');
    expect(result).toContain('gap-4');
    expect(result).toContain('p-6');
    expect(result).toContain('bg-[#FFFFFF]');
    expect(result).toContain('border border-[#E2E8F0]');
    expect(result).toContain('rounded-2xl');
    expect(result).toContain('shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]');
  });

  it('transpiles text typography accurately', () => {
    const textData: NodeInspectionData = {
      id: 'text-1',
      name: 'Header Title',
      type: 'TEXT',
      css: {},
      colors: [
        { hex: '#0F172A', rgba: 'rgba(15, 23, 42, 1)', hsl: 'hsl(222, 47%, 11%)', opacity: 1, source: 'fill' },
      ],
      boxModel: {
        width: 200,
        height: 32,
        x: 0,
        y: 0,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        gap: 0,
        cornerRadius: 0,
      },
      typography: {
        fontFamily: 'Inter',
        fontWeight: 'Bold',
        fontSize: 24,
        textAlign: 'CENTER',
      },
    };

    const result = transpileToTailwind(textData);
    expect(result).toContain('text-2xl');
    expect(result).toContain('font-bold');
    expect(result).toContain('text-center');
    expect(result).toContain('text-[#0F172A]');
    // Should NOT have bg-[#0F172A] since it's a TEXT node
    expect(result).not.toContain('bg-[#0F172A]');
  });

  it('handles asymmetric padding and individual corner radii', () => {
    const asymmetricData: NodeInspectionData = {
      id: 'custom-box',
      name: 'Custom Box',
      type: 'FRAME',
      css: {},
      colors: [],
      boxModel: {
        width: 150,
        height: 75,
        x: 0,
        y: 0,
        paddingTop: 10,
        paddingRight: 15,
        paddingBottom: 20,
        paddingLeft: 25,
        gap: 0,
        cornerRadius: [4, 8, 12, 16],
      },
    };

    const result = transpileToTailwind(asymmetricData);
    expect(result).toContain('pt-2.5');
    expect(result).toContain('pr-[15px]');
    expect(result).toContain('pb-5');
    expect(result).toContain('pl-[25px]');
    expect(result).toContain('rounded-tl-[4px]');
    expect(result).toContain('rounded-tr-[8px]');
    expect(result).toContain('rounded-br-[12px]');
    expect(result).toContain('rounded-bl-[16px]');
  });
});
