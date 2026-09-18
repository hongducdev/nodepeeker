import { describe, it, expect } from 'vitest';
import { resolveVideoFrame, resolveVideoTarget } from '../src/code/video-frame';

const page = { type: 'PAGE' };
const section = { type: 'SECTION' };

const makeFrame = (
  id: string,
  parent: unknown,
  name = id,
  motion: { timelines?: unknown[]; animationStyles?: unknown[]; animations?: unknown } = {}
) =>
  ({
    id,
    name,
    type: 'FRAME',
    parent,
    timelines: motion.timelines ?? [],
    animationStyles: motion.animationStyles ?? [],
    animations: motion.animations ?? {},
  }) as unknown as FrameNode;

const makeNode = (type: string, parent: unknown, topLevel?: unknown) =>
  ({
    id: 'n1',
    name: 'layer',
    type,
    parent,
    getTopLevelFrame: () => topLevel,
  }) as unknown as SceneNode;

describe('resolveVideoTarget', () => {
  const animations = (n: number) =>
    Object.fromEntries(Array.from({ length: n }, (_, i) => [`PROP_${i}`, {}]));

  it('returns the frame and duration when the frame carries a Motion timeline', async () => {
    const frame = makeFrame('9:9', page, 'Loading / Loop', {
      timelines: [{ id: 't1', duration: 0.6 }],
    });

    expect(await resolveVideoTarget(frame)).toEqual({
      frame,
      durationSeconds: 0.6,
      initialFormat: 'MP4',
    });
  });

  it('returns nothing for a static frame, which exportAsync would reject', async () => {
    // The behaviour being fixed: a frame with no motion must not offer an export action.
    expect(await resolveVideoTarget(makeFrame('9:9', page))).toBeUndefined();
  });

  it('counts applied animation styles and keyframes as motion', async () => {
    expect(
      await resolveVideoTarget(makeFrame('9:9', page, 'A', { animationStyles: [{ id: 'a' }] }))
    ).toBeDefined();
    expect(
      await resolveVideoTarget(makeFrame('9:9', page, 'B', { animations: animations(1) }))
    ).toBeDefined();
  });
  it('detects video fill on the frame as encodable video', async () => {
    const frameWithVideo = {
      id: '9:9',
      name: 'Video Frame',
      type: 'FRAME',
      parent: page,
      fills: [{ type: 'VIDEO', visible: true }],
    } as unknown as FrameNode;

    expect(await resolveVideoTarget(frameWithVideo)).toEqual({
      frame: frameWithVideo,
      targetName: 'Video Frame',
      durationSeconds: undefined,
      initialFormat: 'MP4',
      isDirectMedia: true,
      hasVideoFill: true,
    });
  });

  it('reports the enclosing frame, not the layer, for a video layer nested in a page frame', async () => {
    // Figma's encoder only accepts a page-level frame, so a nested video layer cannot be encoded
    // as itself: the panel must name the frame that will actually be encoded, not the layer.
    const parentFrame = makeFrame('9:9', page, 'Parent');
    const videoChild = {
      id: 'c1',
      name: 'Video Layer',
      type: 'RECTANGLE',
      parent: parentFrame,
      fills: [{ type: 'VIDEO', visible: true }],
      getTopLevelFrame: () => parentFrame,
    } as unknown as SceneNode;

    expect(await resolveVideoTarget(videoChild)).toEqual({
      frame: parentFrame,
      durationSeconds: undefined,
      initialFormat: 'MP4',
      hasVideoFill: true,
    });
  });

  it('detects video fill in frame descendants when frame is selected', async () => {
    const child = {
      id: 'c2',
      name: 'Nested Video',
      type: 'RECTANGLE',
      fills: [{ type: 'VIDEO', visible: true }],
    } as unknown as SceneNode;
    const parentFrame = {
      id: '9:9',
      name: 'Parent',
      type: 'FRAME',
      parent: page,
      children: [child],
    } as unknown as FrameNode;

    expect(await resolveVideoTarget(parentFrame)).toEqual({
      frame: parentFrame,
      durationSeconds: undefined,
      initialFormat: 'MP4',
    });
  });

  it('detects GIF or MP4 layer names or exportSettings', async () => {
    const gifFrame = makeFrame('9:9', page, 'animation.gif');
    expect(await resolveVideoTarget(gifFrame)).toEqual({
      frame: gifFrame,
      targetName: 'animation.gif',
      initialFormat: 'GIF',
      isDirectMedia: true,
    });

    const frameWithExportSetting = {
      id: '9:9',
      name: 'Export Setting',
      type: 'FRAME',
      parent: page,
      exportSettings: [{ format: 'GIF' }],
    } as unknown as FrameNode;
    expect(await resolveVideoTarget(frameWithExportSetting)).toEqual({
      frame: frameWithExportSetting,
      targetName: 'Export Setting',
      initialFormat: 'GIF',
      isDirectMedia: true,
    });
  });

  it('detects animation when child has animations or manualKeyframeTracks', async () => {
    const parentFrame = makeFrame('9:9', page, 'Parent');
    const animatedChild = {
      id: 'c3',
      name: 'Child with Keyframes',
      type: 'FRAME',
      parent: parentFrame,
      animations: animations(1),
      getTopLevelFrame: () => parentFrame,
    } as unknown as SceneNode;
    expect(await resolveVideoTarget(animatedChild)).toEqual({
      frame: parentFrame,
      durationSeconds: undefined,
      initialFormat: 'MP4',
    });

    const manualTrackChild = {
      id: 'c4',
      name: 'Child with Manual Tracks',
      type: 'FRAME',
      parent: parentFrame,
      manualKeyframeTracks: { TRANSLATION_X: { keyframes: [] } },
      getTopLevelFrame: () => parentFrame,
    } as unknown as SceneNode;
    expect(await resolveVideoTarget(manualTrackChild)).toEqual({
      frame: parentFrame,
      durationSeconds: undefined,
      initialFormat: 'MP4',
    });
  });

  it('takes the longest timeline when a frame has several', async () => {
    // Descending order on purpose: with ascending input a last-wins loop would return the
    // same value as max, so the test could not tell the two apart.
    const frame = makeFrame('9:9', page, 'Multi', {
      timelines: [
        { id: 't1', duration: 1.25 },
        { id: 't2', duration: 0.4 },
      ],
    });

    expect((await resolveVideoTarget(frame))?.durationSeconds).toBe(1.25);
  });

  it('ignores a non-finite duration rather than reporting it', async () => {
    const frame = makeFrame('9:9', page, 'Odd', {
      timelines: [{ id: 't1', duration: Number.NaN }],
    });

    const target = await resolveVideoTarget(frame);
    expect(target).toBeDefined();
    expect(target?.durationSeconds).toBeUndefined();
  });

  it('returns nothing when there is no page-level frame, even if a nested frame animates', async () => {
    const sectionChild = makeFrame('9:9', section, 'Nested', {
      timelines: [{ id: 't1', duration: 1 }],
    });
    expect(await resolveVideoTarget(makeNode('VECTOR', sectionChild, sectionChild))).toBeUndefined();
    expect(await resolveVideoTarget(undefined)).toBeUndefined();
  });

  it('detects GIF image fills by inspecting image magic bytes', async () => {
    const parentFrame = makeFrame('9:9', page, 'Parent');
    const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // 'GIF89a'
    (globalThis as unknown as { figma: unknown }).figma = {
      getImageByHash: (hash: string) =>
        hash === 'gif123'
          ? { getBytesAsync: async () => gifBytes }
          : null,
    };

    const gifNode = {
      id: 'g1',
      name: 'icon-256x256 1',
      type: 'RECTANGLE',
      parent: parentFrame,
      fills: [{ type: 'IMAGE', imageHash: 'gif123', visible: true }],
      getTopLevelFrame: () => parentFrame,
    } as unknown as SceneNode;

    const target = await resolveVideoTarget(gifNode);
    expect(target).toBeDefined();
    expect(target?.initialFormat).toBe('GIF');
  });
});

describe('resolveVideoFrame', () => {
  it('accepts a frame placed directly on the page without relying on self-return', () => {
    // The docs only promise getTopLevelFrame() for a node *inside* a frame, so a
    // directly-selected top-level frame must not depend on it. Its own call returns
    // undefined here, mirroring that reading.
    const frame = makeFrame('9:9', page);
    const frameWithUndocumentedSelfReturn = {
      ...frame,
      getTopLevelFrame: () => undefined,
    } as unknown as SceneNode;

    expect(resolveVideoFrame(frameWithUndocumentedSelfReturn)).toBe(
      frameWithUndocumentedSelfReturn
    );
  });

  it('walks up to the enclosing top-level frame for a nested layer', () => {
    const outer = makeFrame('9:9', page, 'Loading / Loop');
    const nested = makeNode('VECTOR', makeFrame('9:5', outer), outer);

    expect(resolveVideoFrame(nested)).toBe(outer);
  });

  it('rejects a frame nested in a section, which is not placed directly on a page', () => {
    // exportAsync requires "a frame placed directly on a page"; a section child is the
    // top-most frame but still not encodable.
    const sectionChild = makeFrame('9:9', section);
    expect(resolveVideoFrame(makeNode('VECTOR', sectionChild, sectionChild))).toBeUndefined();
  });

  it('rejects a node with no enclosing frame', () => {
    expect(resolveVideoFrame(makeNode('RECTANGLE', page, undefined))).toBeUndefined();
  });

  it('rejects nothing selected', () => {
    expect(resolveVideoFrame(undefined)).toBeUndefined();
    expect(resolveVideoFrame(null)).toBeUndefined();
  });

  it('returns undefined rather than throwing when the API is unavailable', () => {
    // getTopLevelFrame throws outside Figma Design (FigJam, Slides).
    const throwing = {
      id: 'n1',
      name: 'layer',
      type: 'VECTOR',
      parent: page,
      getTopLevelFrame: () => {
        throw new Error('not supported here');
      },
    } as unknown as SceneNode;

    expect(resolveVideoFrame(throwing)).toBeUndefined();
  });
});
