import { describe, it, expect } from 'vitest';
import { resolveVideoFrame } from '../src/code/video-frame';

const page = { type: 'PAGE' };
const section = { type: 'SECTION' };

const makeFrame = (id: string, parent: unknown, name = id) =>
  ({ id, name, type: 'FRAME', parent }) as unknown as FrameNode;

const makeNode = (type: string, parent: unknown, topLevel?: unknown) =>
  ({
    id: 'n1',
    name: 'layer',
    type,
    parent,
    getTopLevelFrame: () => topLevel,
  }) as unknown as SceneNode;

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
