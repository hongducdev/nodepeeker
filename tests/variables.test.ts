import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { toCssVariableName, extractBoundVariables } from '../src/code/extractors';
import { CodeViewer } from '../src/ui/components/CodeViewer';
import type { NodeInspectionData } from '../src/types/messages';

describe('toCssVariableName', () => {
  it('converts slash-separated paths to kebab-case CSS custom properties', () => {
    expect(toCssVariableName('primary/500')).toBe('--primary-500');
    expect(toCssVariableName('colors/bg/card')).toBe('--colors-bg-card');
  });

  it('handles spaces and uppercase characters', () => {
    expect(toCssVariableName('Spacing / Large')).toBe('--spacing-large');
    expect(toCssVariableName('Radius 12px')).toBe('--radius-12px');
  });

  it('sanitizes special characters and trims dashes', () => {
    expect(toCssVariableName('//Special @#$ Name__')).toBe('--special-name');
    expect(toCssVariableName('')).toBe('--token');
  });
});

describe('extractBoundVariables', () => {
  const getVariableByIdAsync = vi.fn(async (id: string) => {
    if (id === 'var:1') {
      return { id: 'var:1', name: 'primary/500', codeSyntax: { WEB: '--custom-primary' } };
    }
    if (id === 'var:2') {
      return { id: 'var:2', name: 'spacing/md', codeSyntax: {} };
    }
    if (id === 'var:3') {
      return { id: 'var:3', name: 'radius/lg', codeSyntax: {} };
    }
    if (id === 'var:font1') {
      return { id: 'var:font1', name: 'Static/Body Large/Size', codeSyntax: {} };
    }
    if (id === 'var:font2') {
      return { id: 'var:font2', name: 'Static/Body Large/Font', codeSyntax: {} };
    }
    return null;
  });

  const getStyleByIdAsync = vi.fn(async (id: string) => {
    if (id === 'style:text1') {
      return {
        id: 'style:text1',
        type: 'TEXT',
        name: 'Body Large',
        boundVariables: {
          fontSize: { type: 'VARIABLE_ALIAS', id: 'var:font1' },
          fontFamily: { type: 'VARIABLE_ALIAS', id: 'var:font2' },
        },
      };
    }
    return null;
  });

  beforeAll(() => {
    vi.stubGlobal('figma', {
      variables: {
        getVariableByIdAsync,
      },
      getStyleByIdAsync,
    });
  });

  it('resolves boundVariables on node and honors codeSyntax.WEB priority', async () => {
    const mockNode = {
      id: '1:1',
      name: 'Card',
      type: 'FRAME',
      boundVariables: {
        fills: [{ type: 'VARIABLE_ALIAS', id: 'var:1' }],
        itemSpacing: { type: 'VARIABLE_ALIAS', id: 'var:2' },
        cornerRadius: { type: 'VARIABLE_ALIAS', id: 'var:3' },
      },
    } as unknown as SceneNode;

    const tokens = await extractBoundVariables(mockNode);
    expect(tokens).toHaveLength(3);

    // var:1 has codeSyntax.WEB = '--custom-primary'
    const fillToken = tokens.find((t) => t.field === 'fill');
    expect(fillToken).toBeDefined();
    expect(fillToken?.cssVariable).toBe('var(--custom-primary)');
    expect(fillToken?.variableName).toBe('primary/500');

    // var:2 derives from name 'spacing/md' -> '--spacing-md'
    const gapToken = tokens.find((t) => t.field === 'itemSpacing');
    expect(gapToken).toBeDefined();
    expect(gapToken?.cssVariable).toBe('var(--spacing-md)');

    // var:3 derives from name 'radius/lg' -> '--radius-lg'
    const radiusToken = tokens.find((t) => t.field === 'cornerRadius');
    expect(radiusToken).toBeDefined();
    expect(radiusToken?.cssVariable).toBe('var(--radius-lg)');
  });

  it('returns empty array when node has no boundVariables', async () => {
    const mockNode = {
      id: '1:2',
      name: 'Static Box',
      type: 'FRAME',
    } as unknown as SceneNode;

    const tokens = await extractBoundVariables(mockNode);
    expect(tokens).toEqual([]);
  });

  it('extracts typography variables from textStyleId boundVariables', async () => {
    const mockTextNode = {
      id: '1:3',
      name: 'Heading',
      type: 'TEXT',
      textStyleId: 'style:text1',
    } as unknown as SceneNode;

    const tokens = await extractBoundVariables(mockTextNode);
    expect(tokens.some((t) => t.field === 'fontSize' && t.variableName === 'Static/Body Large/Size')).toBe(true);
    expect(tokens.some((t) => t.field === 'fontFamily' && t.variableName === 'Static/Body Large/Font')).toBe(true);
  });

  it('extracts typography variables from getCSSAsync fallback', async () => {
    const mockTextNode = {
      id: '1:4',
      name: 'Fallback Text',
      type: 'TEXT',
    } as unknown as SceneNode;

    const css = {
      'font-size': 'var(--Static-Body-Large-Size, 16px)',
      'font-family': 'var(--Static-Body-Large-Font, Roboto)',
      'line-height': 'var(--Static-Body-Large-Line-Height, 24px)',
    };

    const tokens = await extractBoundVariables(mockTextNode, css);
    expect(tokens.some((t) => t.field === 'fontSize' && t.cssVariable === 'var(--Static-Body-Large-Size)')).toBe(true);
    expect(tokens.some((t) => t.field === 'fontFamily' && t.cssVariable === 'var(--Static-Body-Large-Font)')).toBe(true);
    expect(tokens.some((t) => t.field === 'lineHeight' && t.cssVariable === 'var(--Static-Body-Large-Line-Height)')).toBe(true);
  });
});

describe('CodeViewer Variable Tokens UI', () => {
  const baseDataWithVars: NodeInspectionData = {
    id: '1:5',
    name: 'Token Button',
    type: 'FRAME',
    css: {
      display: 'flex',
      'background-color': '#1e66f5',
      padding: '16px',
      gap: '8px',
      'border-radius': '12px',
    },
    colors: [{ hex: '#1e66f5', rgba: 'rgb(30, 102, 245)', hsl: 'hsl(220, 91%, 54%)', opacity: 1, source: 'fill' }],
    boxModel: {
      width: 120,
      height: 48,
      x: 0,
      y: 0,
      paddingTop: 16,
      paddingRight: 16,
      paddingBottom: 16,
      paddingLeft: 16,
      gap: 8,
      cornerRadius: 12,
    },
    variables: [
      { id: 'v1', field: 'fill', variableName: 'primary/500', cssVariable: 'var(--primary-500)' },
      { id: 'v2', field: 'padding', variableName: 'spacing/md', cssVariable: 'var(--spacing-md)' },
      { id: 'v3', field: 'itemSpacing', variableName: 'spacing/sm', cssVariable: 'var(--spacing-sm)' },
      { id: 'v4', field: 'cornerRadius', variableName: 'radius/lg', cssVariable: 'var(--radius-lg)' },
    ],
  };

  it('renders Tokens toggle button when layer has variables', () => {
    const html = renderToStaticMarkup(
      createElement(CodeViewer, {
        data: baseDataWithVars,
        onCopy: () => {},
        copiedText: null,
      })
    );

    expect(html).toContain('Tokens');
  });

  it('renders bound token pill list at bottom of code viewer', () => {
    const html = renderToStaticMarkup(
      createElement(CodeViewer, {
        data: baseDataWithVars,
        onCopy: () => {},
        copiedText: null,
      })
    );

    expect(html).toContain('var(--primary-500)');
    expect(html).toContain('(primary/500)');
    expect(html).toContain('var(--spacing-md)');
    expect(html).toContain('(spacing/md)');
    expect(html).toContain('var(--radius-lg)');
  });

  it('omits Tokens button and pill list when layer has no variables', () => {
    const html = renderToStaticMarkup(
      createElement(CodeViewer, {
        data: { ...baseDataWithVars, variables: undefined },
        onCopy: () => {},
        copiedText: null,
      })
    );

    expect(html).not.toContain('Tokens:');
  });
});
