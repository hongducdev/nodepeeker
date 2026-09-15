import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NodeLink } from '../src/ui/components/NodeLink';

// renderToStaticMarkup keeps this dependency-free: no jsdom, no testing-library.
const render = (props: {
  nodeId: string;
  fileKey?: string;
  fileName?: string;
  copiedText?: string | null;
}) =>
  renderToStaticMarkup(
    createElement(NodeLink, {
      nodeId: props.nodeId,
      fileKey: props.fileKey,
      fileName: props.fileName ?? 'Frameflow',
      onCopy: () => {},
      copiedText: props.copiedText ?? null,
    })
  );

const decode = (html: string) => html.replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
const textOf = (html: string) => decode(html).replace(/<[^>]*>/g, '');

describe('NodeLink', () => {
  it('shows the deep link when a file key is available', () => {
    const html = render({ nodeId: '3844:702', fileKey: 'aXrG' });
    expect(textOf(html)).toContain(
      'https://www.figma.com/design/aXrG/Frameflow?node-id=3844-702'
    );
    expect(textOf(html)).not.toContain('unavailable');
  });

  it('falls back to the URL form of the node id and explains why', () => {
    const html = render({ nodeId: '3844:702' });
    expect(textOf(html)).toContain('3844-702');
    expect(textOf(html)).toContain('Full link unavailable');
  });

  it('labels the fallback as the URL form, not as the API node id', () => {
    // These are genuinely different strings; calling the hyphenated one "the node ID"
    // would send API users to a lookup that cannot resolve it.
    const html = decode(render({ nodeId: '3844:702' }));
    expect(html).toContain('node ID in URL form');
    expect(html).toContain('API calls need 3844:702');
    expect(textOf(render({ nodeId: '3844:702' }))).toContain('3844-702');
  });
});
