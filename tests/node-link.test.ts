import { describe, it, expect } from 'vitest';
import { buildNodeUrl, toNodeIdParam } from '../src/utils/node-link';

describe('toNodeIdParam', () => {
  it('converts the colon separator Figma uses internally to the dash used in URLs', () => {
    expect(toNodeIdParam('1:2')).toBe('1-2');
    expect(toNodeIdParam('3844:702')).toBe('3844-702');
  });

  it('leaves an already-dashed or separator-free id alone', () => {
    expect(toNodeIdParam('1-2')).toBe('1-2');
    expect(toNodeIdParam('42')).toBe('42');
  });

  it('converts every separator, not just the first', () => {
    expect(toNodeIdParam('I1:2;3:4')).toBe('I1-2;3-4');
  });
});

describe('buildNodeUrl', () => {
  it('builds a deep link to the node', () => {
    expect(buildNodeUrl('aXrGAc4tTcMFWklkcboC1l', 'Frameflow', '3844:702')).toBe(
      'https://www.figma.com/design/aXrGAc4tTcMFWklkcboC1l/Frameflow?node-id=3844-702'
    );
  });

  it('returns null without a file key so callers must degrade explicitly', () => {
    // The realistic case: a public plugin, or an unsaved file.
    expect(buildNodeUrl(undefined, 'Frameflow', '3844:702')).toBeNull();
    expect(buildNodeUrl('', 'Frameflow', '3844:702')).toBeNull();
  });

  it('slugifies a file name that contains spaces and separators', () => {
    expect(buildNodeUrl('KEY', 'My Design / v2', '1:2')).toBe(
      'https://www.figma.com/design/KEY/My-Design-v2?node-id=1-2'
    );
  });

  it('omits the name segment when the file name is blank', () => {
    expect(buildNodeUrl('KEY', '', '1:2')).toBe(
      'https://www.figma.com/design/KEY?node-id=1-2'
    );
    expect(buildNodeUrl('KEY', '   ', '1:2')).toBe(
      'https://www.figma.com/design/KEY?node-id=1-2'
    );
  });

  it('collapses a dash adjacent to a stripped character', () => {
    // The old input ('  a  b  ') could never produce '--', so the assertion was vacuous.
    // 'a -b' does: the space becomes '-' and the literal '-' follows it.
    expect(buildNodeUrl('KEY', 'a -b', '1:2')).toBe(
      'https://www.figma.com/design/KEY/a-b?node-id=1-2'
    );
    expect(buildNodeUrl('KEY', 'a -b', '1:2')).not.toContain('--');
  });

  it('strips a leading or trailing separator', () => {
    expect(buildNodeUrl('KEY', 'Design /', '1:2')).toBe(
      'https://www.figma.com/design/KEY/Design?node-id=1-2'
    );
    expect(buildNodeUrl('KEY', '/Design', '1:2')).toBe(
      'https://www.figma.com/design/KEY/Design?node-id=1-2'
    );
    expect(buildNodeUrl('KEY', '-', '1:2')).toBe(
      'https://www.figma.com/design/KEY?node-id=1-2'
    );
  });

  it('removes characters that would break URL parsing entirely', () => {
    // A literal '#' would turn the rest of the URL into a fragment.
    const url = buildNodeUrl('KEY', 'a#b', '1:2');
    expect(url).not.toContain('#');
    expect(url).toBe('https://www.figma.com/design/KEY/a-b?node-id=1-2');
  });

  it('percent-encodes characters that survive slugging', () => {
    const url = buildNodeUrl('KEY', 'a&b', '1:2');
    expect(url).not.toContain('&');
    expect(url).toContain('a%26b');
  });
});
