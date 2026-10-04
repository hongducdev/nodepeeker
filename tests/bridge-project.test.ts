import { describe, it, expect } from 'vitest';
import { projectView, toSummary } from '../bridge/project';
import type { NodeInspectionData } from '../src/types/messages';

const mockData: NodeInspectionData = {
  id: '5:5',
  name: 'Hero Card',
  type: 'FRAME',
  css: { display: 'flex', 'background-color': '#1E1E2E' },
  colors: [{ hex: '#1E1E2E', rgba: 'rgb(30, 30, 46)', hsl: 'hsl(240, 21%, 15%)', opacity: 1, source: 'fill' }],
  boxModel: {
    width: 300,
    height: 150,
    x: 0,
    y: 0,
    paddingTop: 16,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16,
    gap: 8,
    cornerRadius: 8,
  },
  layoutMode: 'VERTICAL',
  border: {
    strokeWeight: 1,
    color: '#313244',
    strokeStyle: 'solid',
  },
};

describe('projectView', () => {
  it('projects summary view with rounded numbers and padding', () => {
    const summary = toSummary(mockData);
    expect(summary).toMatchObject({
      id: '5:5',
      name: 'Hero Card',
      width: 300,
      height: 150,
      layoutMode: 'VERTICAL',
      padding: '16px',
      gap: 8,
      radius: 8,
    });
  });

  it('projects tailwind view', () => {
    const res = projectView(mockData, 'tailwind') as { tailwind: string };
    expect(res.tailwind).toContain('w-[300px]');
    expect(res.tailwind).toContain('h-[150px]');
  });

  it('projects css view', () => {
    const res = projectView(mockData, 'css') as { css: Record<string, string> };
    expect(res.css).toEqual({ display: 'flex', 'background-color': '#1E1E2E' });
  });

  it('projects react-native view', () => {
    const res = projectView(mockData, 'react-native') as { reactNative: string };
    expect(res.reactNative).toContain('StyleSheet.create');
    expect(res.reactNative).toContain('width: 300');
    expect(res.reactNative).toContain('height: 150');
    expect(res.reactNative).toContain('flexDirection: \'column\'');
  });

  it('projects flutter view', () => {
    const res = projectView(mockData, 'flutter') as { flutter: string };
    expect(res.flutter).toContain('Container(');
    expect(res.flutter).toContain('width: 300');
    expect(res.flutter).toContain('height: 150');
    expect(res.flutter).toContain('Color(0xFF1E1E2E)');
  });

  it('projects swiftui view', () => {
    const res = projectView(mockData, 'swiftui') as { swiftUI: string };
    expect(res.swiftUI).toContain('.frame(width: 300, height: 150)');
    expect(res.swiftUI).toContain('.padding(16)');
    expect(res.swiftUI).toContain('.cornerRadius(8)');
  });

  it('projects compose view', () => {
    const res = projectView(mockData, 'compose') as { compose: string };
    expect(res.compose).toContain('.size(width = 300.dp, height = 150.dp)');
    expect(res.compose).toContain('.padding(16.dp)');
    expect(res.compose).toContain('RoundedCornerShape(8.dp)');
  });

  it('projects full view', () => {
    const res = projectView(mockData, 'full');
    expect(res).toBe(mockData);
  });
});
