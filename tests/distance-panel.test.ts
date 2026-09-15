import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DistancePanel } from '../src/ui/components/DistancePanel';
import { measureDistance, type DistanceNode } from '../src/utils/distance';

const node = (name: string, x: number, y: number, width: number, height: number): DistanceNode => ({
  name,
  bounds: { x, y, width, height },
});

const renderWith = (a: DistanceNode, b: DistanceNode, onCopy = () => {}) =>
  renderToStaticMarkup(createElement(DistancePanel, { measurement: measureDistance(a, b), onCopy }));

const render = (a: DistanceNode, b: DistanceNode) => renderWith(a, b);

/** Rows are `label value`; extract a single row's value so an assertion cannot be satisfied
 *  by a different row's number (a bare `toContain('0px')` matches inside `20px`). */
const rowValue = (html: string, label: string): string | undefined => {
  const text = html.replace(/<[^>]*>/g, '\n');
  const pattern = new RegExp(`${label}\\s*\\n+\\s*([^\\n]+)`, 'i');
  return text.match(pattern)?.[1]?.trim();
};

/** Each diagram box's inline style, whitespace-stripped so assertions do not depend on how
 *  React happens to serialise the attribute. */
const boxStyles = (html: string) =>
  Array.from(html.matchAll(/class="absolute[^"]*"\s+style="([^"]*)"/g)).map((m) =>
    m[1].replace(/\s+/g, '')
  );

const styleValue = (style: string, prop: string) =>
  Number.parseFloat(style.match(new RegExp(`${prop}:([\\d.]+)%`))![1]);

const A = node('Button', 0, 0, 100, 50);

describe('DistancePanel', () => {
  it('names both layers so it is clear what was measured', () => {
    const text = render(A, node('Card', 120, 0, 50, 50)).replace(/<[^>]*>/g, ' ');
    expect(text).toContain('Button');
    expect(text).toContain('Card');
    expect(text).toContain('Distance');
  });

  it('reports each gap against its own row', () => {
    // A{0,0,100,50} and B{120,90,60,30}: gapX 20, gapY 40 -- distinct, so a swap cannot pass,
    // and neither is zero, so a row cannot borrow another row's value.
    const html = render(A, node('Card', 120, 90, 60, 30));
    expect(rowValue(html, 'horizontal')).toBe('20px');
    expect(rowValue(html, 'vertical')).toBe('40px');
  });

  it('says which way the second layer sits', () => {
    expect(render(A, node('Card', 120, 0, 50, 50))).toContain('is to the right of');
    expect(render(A, node('Card', 0, 80, 50, 50))).toContain('is below');
    expect(render(A, node('Card', -80, 0, 50, 50))).toContain('is to the left of');
    expect(render(A, node('Card', 0, -80, 50, 50))).toContain('is above');
    expect(render(A, node('Card', 50, 25, 100, 50))).toContain('is overlapping');
  });

  it('reports zeroed gaps plus explicit overlap extents when the boxes intersect', () => {
    const html = render(A, node('Card', 50, 25, 100, 50));
    expect(rowValue(html, 'horizontal')).toBe('0px');
    expect(rowValue(html, 'vertical')).toBe('0px');
    expect(rowValue(html, 'overlap')).toBe('50 × 25px');
  });

  it('omits the overlap row entirely when the boxes do not intersect', () => {
    expect(rowValue(render(A, node('Card', 120, 0, 50, 50)), 'overlap')).toBeUndefined();
  });

  it('lists the aligned edges by name', () => {
    expect(rowValue(render(A, node('Card', 0, 60, 100, 40)), 'aligned')).toBe(
      'left, right, centerX'
    );
  });

  it('omits the alignment row when nothing lines up', () => {
    expect(rowValue(render(A, node('Card', 33, 77, 40, 40)), 'aligned')).toBeUndefined();
  });

  it('offers the measured gap to the clipboard, not a raw axis value', () => {
    const onCopy = vi.fn();
    // The overlapping pair's headline is the overlap extent, not the `0px` the gap rows show.
    const html = renderWith(A, node('Card', 50, 25, 100, 50), onCopy);
    const buttonText = html.match(/<button[^>]*>([\s\S]*?)<\/button>/)?.[1] ?? '';

    expect(buttonText).toContain('overlap 50 × 25');
    expect(rowValue(html, 'horizontal')).toBe('0px');
  });

  it('draws both boxes at their own proportional position and size', () => {
    // A{0,0,100,50} and B{120,90,60,30} -> union 180x120, so every number below is distinct
    // and a swapped or misassigned box cannot pass.
    const html = render(A, node('Card', 120, 90, 60, 30));
    const styles = boxStyles(html);
    expect(styles).toHaveLength(2);

    expect(styleValue(styles[0], 'left')).toBe(0);
    expect(styleValue(styles[0], 'top')).toBe(0);
    expect(styleValue(styles[0], 'width')).toBeCloseTo(55.5556, 3);
    expect(styleValue(styles[0], 'height')).toBeCloseTo(41.6667, 3);

    expect(styleValue(styles[1], 'left')).toBeCloseTo(66.6667, 3);
    expect(styleValue(styles[1], 'top')).toBe(75);
    expect(styleValue(styles[1], 'width')).toBeCloseTo(33.3333, 3);
    expect(styleValue(styles[1], 'height')).toBe(25);
  });

  it('keeps a tiny box inside the frame instead of clipping it', () => {
    // A floored 6%-wide box at the union's far edge would start at 99% and be clipped away.
    const html = render(node('Big', 0, 0, 1000, 1000), node('Dot', 999, 999, 1, 1));
    const dot = boxStyles(html)[1];

    expect(styleValue(dot, 'width')).toBe(6);
    expect(styleValue(dot, 'left') + styleValue(dot, 'width')).toBeLessThanOrEqual(100);
    expect(styleValue(dot, 'top') + styleValue(dot, 'height')).toBeLessThanOrEqual(100);
  });
});
