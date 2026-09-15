import { describe, it, expect } from 'vitest';
import manifest from '../manifest.json';

describe('manifest.json validation', () => {
  it('has required top-level Figma plugin fields', () => {
    expect(typeof manifest.name).toBe('string');
    expect(typeof manifest.id).toBe('string');
    expect(typeof manifest.api).toBe('string');
    expect(typeof manifest.main).toBe('string');
    expect(typeof manifest.ui).toBe('string');
    expect(Array.isArray(manifest.editorType)).toBe(true);
    expect(manifest.editorType).toContain('figma');
  });

  it('validates relaunchButtons schema strictly per Figma specification', () => {
    expect(Array.isArray(manifest.relaunchButtons)).toBe(true);
    // Without this, an empty array would make the whole schema check vacuous.
    expect(manifest.relaunchButtons.length).toBeGreaterThan(0);
    manifest.relaunchButtons.forEach((btn: Record<string, unknown>, index: number) => {
      expect(
        typeof btn.name,
        `relaunchButtons[${index}].name must be a non-empty string`
      ).toBe('string');
      expect((btn.name as string).length).toBeGreaterThan(0);

      expect(
        typeof btn.command,
        `relaunchButtons[${index}].command must be a non-empty string`
      ).toBe('string');
      expect((btn.command as string).length).toBeGreaterThan(0);

      if (btn.multipleSelection !== undefined) {
        expect(typeof btn.multipleSelection).toBe('boolean');
      }

      // Ensure "text" was not mistakenly used instead of "name"
      expect(btn.text).toBeUndefined();
    });
  });

  it('keeps the flag that makes figma.fileKey readable', () => {
    // The sole prerequisite for building a deep link in the link bar; removing it
    // silently degrades every link to the node-id fallback.
    expect(manifest.enablePrivatePluginApi).toBe(true);
  });

  it('verifies paths in main and ui point to expected dist targets', () => {
    expect(manifest.main).toBe('dist/code.js');
    expect(manifest.ui).toBe('dist/index.html');
  });
});
