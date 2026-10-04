import { describe, it, expect } from 'vitest';
import {
  transpileToReactNative,
  transpileToFlutter,
  transpileToSwiftUI,
  transpileToCompose,
} from '../src/utils/transpilers';
import type { NodeInspectionData } from '../src/types/messages';

const mockFrame = (overrides: Partial<NodeInspectionData> = {}): NodeInspectionData => ({
  id: '10:20',
  name: 'Primary Card',
  type: 'FRAME',
  css: {},
  colors: [{ hex: '#1E1E2E', rgba: 'rgb(30, 30, 46)', hsl: 'hsl(240, 21%, 15%)', opacity: 1, source: 'fill' }],
  boxModel: {
    width: 320,
    height: 180,
    x: 0,
    y: 0,
    paddingTop: 16,
    paddingRight: 24,
    paddingBottom: 16,
    paddingLeft: 24,
    gap: 12,
    cornerRadius: 12,
  },
  layoutMode: 'HORIZONTAL',
  primaryAxisAlign: 'CENTER',
  counterAxisAlign: 'CENTER',
  border: {
    strokeWeight: 1,
    color: '#313244',
    strokeStyle: 'solid',
  },
  shadows: [
    {
      inner: false,
      offsetX: 0,
      offsetY: 4,
      blur: 8,
      spread: 0,
      color: '#000000',
      opacity: 0.25,
    },
  ],
  ...overrides,
});

const mockText = (overrides: Partial<NodeInspectionData> = {}): NodeInspectionData => ({
  id: '10:21',
  name: 'Title Text',
  type: 'TEXT',
  css: {},
  colors: [{ hex: '#CDD6F4', rgba: 'rgb(205, 214, 244)', hsl: 'hsl(226, 64%, 88%)', opacity: 1, source: 'fill' }],
  boxModel: {
    width: 200,
    height: 28,
    x: 0,
    y: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    gap: 0,
    cornerRadius: 0,
  },
  typography: {
    fontFamily: 'Inter',
    fontWeight: 'Bold',
    fontSize: 20,
    lineHeight: 28,
  },
  ...overrides,
});

describe('React Native Transpiler', () => {
  it('generates valid StyleSheet.create with flex, dimensions, and padding', () => {
    const code = transpileToReactNative(mockFrame());
    expect(code).toContain('StyleSheet.create');
    expect(code).toContain('flexDirection: \'row\'');
    expect(code).toContain('justifyContent: \'center\'');
    expect(code).toContain('alignItems: \'center\'');
    expect(code).toContain('width: 320');
    expect(code).toContain('height: 180');
    expect(code).toContain('paddingVertical: 16');
    expect(code).toContain('paddingHorizontal: 24');
    expect(code).toContain('backgroundColor: \'#1E1E2E\'');
    expect(code).toContain('borderRadius: 12');
    expect(code).toContain('borderWidth: 1');
    expect(code).toContain('borderColor: \'#313244\'');
  });

  it('handles typography for TEXT nodes', () => {
    const code = transpileToReactNative(mockText());
    expect(code).toContain('fontSize: 20');
    expect(code).toContain('fontFamily: \'Inter\'');
    expect(code).toContain('color: \'#CDD6F4\'');
  });
});

describe('Flutter Transpiler', () => {
  it('generates Container with BoxDecoration and Color in ARGB format', () => {
    const code = transpileToFlutter(mockFrame());
    expect(code).toContain('Container(');
    expect(code).toContain('width: 320');
    expect(code).toContain('height: 180');
    expect(code).toContain('padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16)');
    expect(code).toContain('decoration: BoxDecoration(');
    expect(code).toContain('color: const Color(0xFF1E1E2E)');
    expect(code).toContain('borderRadius: BorderRadius.circular(12)');
    expect(code).toContain('border: Border.all(color: const Color(0xFF313244), width: 1)');
    expect(code).toContain('BoxShadow(');
  });

  it('generates TextStyle for TEXT nodes', () => {
    const code = transpileToFlutter(mockText());
    expect(code).toContain('TextStyle(');
    expect(code).toContain('fontSize: 20');
    expect(code).toContain('fontFamily: \'Inter\'');
    expect(code).toContain('color: const Color(0xFFCDD6F4)');
  });
});

describe('SwiftUI Transpiler', () => {
  it('generates chained modifiers for frame, padding, background, and radius', () => {
    const code = transpileToSwiftUI(mockFrame());
    expect(code).toContain('.frame(width: 320, height: 180)');
    expect(code).toContain('.padding(.horizontal, 24)');
    expect(code).toContain('.padding(.vertical, 16)');
    expect(code).toContain('.cornerRadius(12)');
    expect(code).toContain('.shadow(');
  });

  it('generates Text view with custom font for TEXT nodes', () => {
    const code = transpileToSwiftUI(mockText());
    expect(code).toContain('Text("Title Text")');
    expect(code).toContain('.font(.custom("Inter", size: 20))');
    expect(code).toContain('.fontWeight(.bold)');
  });
});

describe('Compose Transpiler', () => {
  it('generates chained Modifier calls with size, padding, background and shape', () => {
    const code = transpileToCompose(mockFrame());
    expect(code).toContain('.size(width = 320.dp, height = 180.dp)');
    expect(code).toContain('.padding(horizontal = 24.dp, vertical = 16.dp)');
    expect(code).toContain('RoundedCornerShape(12.dp)');
    expect(code).toContain('.background(');
    expect(code).toContain('.border(');
  });

  it('generates Text with TextStyle for TEXT nodes', () => {
    const code = transpileToCompose(mockText());
    expect(code).toContain('Text(');
    expect(code).toContain('fontSize = 20.sp');
    expect(code).toContain('fontWeight = FontWeight.Bold');
  });
});
