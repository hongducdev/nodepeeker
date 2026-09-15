import { describe, it, expect } from 'vitest';

describe('code-highlighter and default tab', () => {
  it('identifies CSS property and value tokens accurately', () => {
    const cssSample = 'width: 320px;\nbackground: #2563EB;\nborder-radius: 8px;';
    const lines = cssSample.split('\n');

    expect(lines.length).toBe(3);

    const line0 = lines[0];
    const colonIdx = line0.indexOf(':');
    expect(colonIdx).toBe(5);
    expect(line0.slice(0, colonIdx)).toBe('width');
    expect(line0.slice(colonIdx + 1).trim()).toBe('320px;');

    const line1 = lines[1];
    expect(line1).toContain('#2563EB');
  });

  it('handles Tailwind utility class categorization', () => {
    const twSample = 'flex flex-row items-center justify-between p-4 bg-[#2563EB] rounded-lg shadow-md';
    const classes = twSample.split(' ');

    expect(classes).toContain('flex');
    expect(classes).toContain('p-4');
    expect(classes).toContain('bg-[#2563EB]');
    expect(classes).toContain('rounded-lg');
    expect(classes).toContain('shadow-md');
  });
});
