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

  it('returns the frame and duration when the frame carries a Motion timeline', () => {
    const frame = makeFrame('9:9', page, 'Loading / Loop', {
      timelines: [{ id: 't1', duration: 0.6 }],
    });

    expect(resolveVideoTarget(frame)).toEqual({ frame, durationSeconds: 0.6 });
  });

  it('returns nothing for a static frame, which exportAsync would reject', () => {
    // The behaviour being fixed: a frame with no motion must not offer an export action.
    expect(resolveVideoTarget(makeFrame('9:9', page))).toBeUndefined();
  });

  it('counts applied animation styles and keyframes as motion', () => {
    expect(
      resolveVideoTarget(makeFrame('9:9', page, 'A', { animationStyles: [{ id: 'a' }] }))
    ).toBeDefined();
    expect(
      resolveVideoTarget(makeFrame('9:9', page, 'B', { animations: animations(1) }))
    ).toBeDefined();
  });

  it('takes the longest timeline when a frame has several', () => {
    // Descending order on purpose: with ascending input a last-wins loop would return the
    // same value as max, so the test could not tell the two apart.
    const frame = makeFrame('9:9', page, 'Multi', {
      timelines: [
        { id: 't1', duration: 1.25 },
        { id: 't2', duration: 0.4 },
      ],
    });

    expect(resolveVideoTarget(frame)?.durationSeconds).toBe(1.25);
  });

  it('ignores a non-finite duration rather than reporting it', () => {
    const frame = makeFrame('9:9', page, 'Odd', {
      timelines: [{ id: 't1', duration: Number.NaN }],
    });

    const target = resolveVideoTarget(frame);
    expect(target).toBeDefined();
    expect(target?.durationSeconds).toBeUndefined();
  });

  it('returns nothing when there is no page-level frame, even if a nested frame animates', () => {
    const sectionChild = makeFrame('9:9', section, 'Nested', {
      timelines: [{ id: 't1', duration: 1 }],
    });
    expect(resolveVideoTarget(makeNode('VECTOR', sectionChild, sectionChild))).toBeUndefined();
    expect(resolveVideoTarget(undefined)).toBeUndefined();
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
