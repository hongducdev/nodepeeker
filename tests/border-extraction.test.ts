import { describe, it, expect } from 'vitest';
import { extractNodeData } from '../src/code/extractors';

describe('border extraction scoping', () => {
  it('creates a border when the node itself has a visible solid stroke', async () => {
    const node = {
      id: 'n1',
      name: 'Stroked Frame',
      type: 'FRAME',
      width: 200,
      height: 100,
      x: 0,
      y: 0,
      strokes: [{ type: 'SOLID', visible: true, color: { r: 0.23, g: 0.51, b: 0.96 } }],
      strokeWeight: 2,
      strokeAlign: 'INSIDE',
      fills: [],
      effects: [],
      children: [],
    } as unknown as SceneNode;

    const data = await extractNodeData(node);
    expect(data.border).toBeDefined();
    expect(data.border?.strokeWeight).toBe(2);
    expect(data.border?.strokeStyle).toBe('solid');
    expect(data.css['border']).toBe('2px solid #3B82F5');
  });

  it('does NOT synthesize a border on a parent when only children have strokes', async () => {
    const child = {
      id: 'c1',
      name: 'Child',
      type: 'RECTANGLE',
      width: 50,
      height: 50,
      fills: [],
      strokes: [{ type: 'SOLID', visible: true, color: { r: 1, g: 0, b: 0 } }],
      effects: [],
    };
    const parent = {
      id: 'p1',
      name: 'Borderless Parent',
      type: 'FRAME',
      width: 200,
      height: 200,
      x: 0,
      y: 0,
      strokes: [],
      fills: [],
      effects: [],
      children: [child],
    } as unknown as SceneNode;

    const data = await extractNodeData(parent);
    expect(data.border).toBeUndefined();
    expect(data.css['border']).toBeUndefined();
    // Child stroke color is still surfaced in the palette
    expect(data.colors.some((c) => c.source === 'stroke')).toBe(true);
  });

  it('defaults to a 1px border when a stroke exists with zero weight', async () => {
    const node = {
      id: 'n2',
      name: 'Zero Weight',
      type: 'RECTANGLE',
      width: 10,
      height: 10,
      strokes: [{ type: 'SOLID', visible: true, color: { r: 0, g: 0, b: 0 } }],
      strokeWeight: 0,
      fills: [],
      effects: [],
    } as unknown as SceneNode;

    const data = await extractNodeData(node);
    expect(data.border?.strokeWeight).toBe(1);
    expect(data.css['border']).toBe('1px solid #000000');
  });

  it('maps dash patterns to dashed and dotted stroke styles', async () => {
    const dashed = {
      id: 'n3',
      name: 'Dashed',
      type: 'RECTANGLE',
      width: 10,
      height: 10,
      strokes: [{ type: 'SOLID', visible: true, color: { r: 0, g: 0, b: 0 } }],
      strokeWeight: 1,
      dashPattern: [4, 4],
      fills: [],
      effects: [],
    } as unknown as SceneNode;

    const dotted = {
      id: 'n4',
      name: 'Dotted',
      type: 'RECTANGLE',
      width: 10,
      height: 10,
      strokes: [{ type: 'SOLID', visible: true, color: { r: 0, g: 0, b: 0 } }],
      strokeWeight: 1,
      dashPattern: [1, 3],
      fills: [],
      effects: [],
    } as unknown as SceneNode;

    expect((await extractNodeData(dashed)).border?.strokeStyle).toBe('dashed');
    expect((await extractNodeData(dotted)).border?.strokeStyle).toBe('dotted');
  });
});
