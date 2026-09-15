import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VideoExport } from '../src/ui/components/VideoExport';

// renderToStaticMarkup covers the initial (MP4) render and the disabled/encoding state
// without jsdom or testing-library, neither of which is installed.
const render = (props: { isExporting?: boolean } = {}) =>
  renderToStaticMarkup(
    createElement(VideoExport, {
      frame: { id: '9:9', name: 'Loading / Loop' },
      onExport: () => {},
      isExporting: props.isExporting ?? false,
    })
  );

const decode = (html: string) => html.replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
const textOf = (html: string) => decode(html).replace(/<[^>]*>/g, ' ');
const optionsOf = (html: string) =>
  [...html.matchAll(/<option[^>]*value="([^"]*)"/g)].map((m) => m[1]);

describe('VideoExport', () => {
  it('names the frame that will be encoded, not the selection', () => {
    // The encoded frame is often not the selected layer, so the label is the only thing
    // telling the user what the file will contain.
    expect(textOf(render())).toContain('Loading / Loop');
    expect(textOf(render())).toContain('Encodes the whole frame');
  });

  it('opens on MP4 with a quality control rather than a loop count', () => {
    const html = render();
    expect(textOf(html)).toContain('MP4');
    expect(textOf(html)).toContain('GIF');
    expect(textOf(html)).toContain('quality');
    expect(textOf(html)).not.toContain('loop');
  });

  it('offers only the fps rates MP4 accepts', () => {
    expect(optionsOf(render())).toEqual(
      expect.arrayContaining(['12', '24', '30', '60'])
    );
    expect(optionsOf(render())).not.toContain('8');
  });

  it('offers a download action for the current format', () => {
    expect(textOf(render())).toContain('Download MP4');
  });

  it('disables the action and says it is encoding while in flight', () => {
    const html = render({ isExporting: true });
    expect(textOf(html)).toContain('Encoding');
    expect(html).toContain('disabled');
  });
});
