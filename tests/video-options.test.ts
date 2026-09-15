import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FPS,
  FPS_BY_FORMAT,
  QUALITY_OPTIONS,
  SCALE_VALUES,
  clampFps,
  supportsQuality,
  videoExtension,
  videoMime,
} from '../src/utils/video-options';

describe('video fps options', () => {
  it('keeps the per-format sets distinct, because Figma rejects an out-of-set fps', () => {
    expect(FPS_BY_FORMAT.GIF).toEqual([8, 12, 15, 24, 30]);
    expect(FPS_BY_FORMAT.MP4).toEqual([12, 24, 30, 60]);
  });

  it('defaults to the rates Figma documents for each format', () => {
    // These are user-visible: they seed the select in VideoExport, so a change silently
    // alters what the panel opens on.
    expect(DEFAULT_FPS.MP4).toBe(30);
    expect(DEFAULT_FPS.GIF).toBe(15);
  });
});

describe('clampFps', () => {
  it('passes an allowed value through untouched', () => {
    expect(clampFps('MP4', 24)).toBe(24);
    expect(clampFps('GIF', 8)).toBe(8);
  });

  it('snaps a value the format does not accept onto the nearest allowed one', () => {
    // 60 is an MP4 rate; for GIF the nearest allowed value is 30.
    expect(FPS_BY_FORMAT.GIF).not.toContain(60);
    expect(clampFps('GIF', 60)).toBe(30);
    expect(clampFps('MP4', 13)).toBe(12);
  });

  it('always returns something the format accepts, for any input', () => {
    for (const format of ['MP4', 'GIF'] as const) {
      for (const input of [-100, 0, 1, 7, 13, 45, 1000, Number.NaN]) {
        expect(FPS_BY_FORMAT[format]).toContain(clampFps(format, input));
      }
    }
  });

  it('falls back to the documented default when the input is not a usable number', () => {
    // Every comparison against a non-finite value is false, so the reduce keeps its seed.
    // Pinning this makes the fallback deliberate rather than an accident of the seed.
    for (const weird of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(clampFps('MP4', weird)).toBe(DEFAULT_FPS.MP4);
      expect(clampFps('GIF', weird)).toBe(DEFAULT_FPS.GIF);
    }
  });
});

describe('format capabilities', () => {
  it('offers a quality preset only for MP4', () => {
    expect(supportsQuality('MP4')).toBe(true);
    expect(supportsQuality('GIF')).toBe(false);
  });

  it('lists the scales Figma actually accepts', () => {
    expect(SCALE_VALUES).toEqual([0.5, 0.75, 1, 1.5, 2, 3, 4]);
  });

  it('offers every quality Figma accepts', () => {
    expect(QUALITY_OPTIONS).toEqual(['LOW', 'MEDIUM', 'HIGH']);
  });

  it('pairs each format with a matching MIME type and extension', () => {
    // A mismatch here produces a corrupt file carrying a plausible name, so the pairing
    // is asserted rather than derived inline in the UI.
    expect([videoMime('MP4'), videoExtension('MP4')]).toEqual(['video/mp4', 'mp4']);
    expect([videoMime('GIF'), videoExtension('GIF')]).toEqual(['image/gif', 'gif']);
  });
});
