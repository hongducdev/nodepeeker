import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VideoExport } from '../src/ui/components/VideoExport';

// renderToStaticMarkup covers the initial (MP4) render and the disabled/encoding state
// without jsdom or testing-library, neither of which is installed.
const render = (
  props: {
    isExporting?: boolean;
    durationSeconds?: number;
    hasVideo?: boolean;
    hasVideoFill?: boolean;
    isDirectMedia?: boolean;
  } = {}
) =>
  renderToStaticMarkup(
    createElement(VideoExport, {
      video:
        props.hasVideo === false
          ? undefined
          : {
              frameId: '9:9',
              frameName: 'Loading / Loop',
              durationSeconds: props.durationSeconds,
              hasVideoFill: props.hasVideoFill,
              isDirectMedia: props.isDirectMedia,
            },
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
    const text = textOf(render());
    expect(text).toContain('Loading / Loop');
    expect(text).toContain('Detected motion');
    expect(text).toContain('the whole frame is encoded, not the layer');
  });

  it('shows the detected motion duration when one is available', () => {
    // Visible proof that detection ran, rather than a section that appears unconditionally.
    expect(textOf(render({ durationSeconds: 0.6 }))).toContain('0.6s');
    expect(textOf(render())).not.toContain('undefined');
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

  it('renders dimmed, unclickable and disabled when no video or gif is detected', () => {
    const html = render({ hasVideo: false });
    const text = textOf(html);

    expect(text).toContain('Disabled');
    expect(text).toContain('No video, GIF, or motion animation detected in selection');
    expect(html).toContain('opacity-25');
    expect(html).toContain('blur-[1.5px]');
    expect(text).toContain('Chỉ hỗ trợ Video hoặc GIF');
    expect(html).toContain('select-none');
    expect(html).toContain('pointer-events-none');
    expect(html).toContain('disabled');
    expect(text).not.toContain('Loading / Loop');
  });

  it('points at Dev Mode for the original file when the selection paints a video', () => {
    // A plugin cannot read video bytes (`VideoPaint` gives only a hash), so choosing the wrong
    // silent nothing would leave the user with no route to their own file.
    const text = textOf(render({ hasVideoFill: true }));
    expect(text).toContain('Need the original file?');
    expect(text).toContain('Dev Mode');
    expect(text).toContain('Assets');
    expect(text).toContain('Download');
  });

  it('omits the Dev Mode hint when the selection is not a video fill', () => {
    // A GIF is read straight from its fill bytes, so the hint would be noise there.
    expect(textOf(render())).not.toContain('Need the original file?');
    expect(textOf(render({ hasVideoFill: true, isDirectMedia: true }))).not.toContain(
      'Need the original file?'
    );
  });
});
