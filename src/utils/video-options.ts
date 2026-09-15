import type { VideoFormat, VideoQuality, VideoScale } from '../types/messages';

/**
 * Figma accepts a different fps set per video format, so the UI options and the sandbox-side
 * guard both read from here rather than hard-coding their own lists. The literal unions let
 * the sandbox pass a value straight to `exportAsync` without a cast -- a widened `number[]`
 * would silently allow an out-of-set rate to be sent.
 */
export const FPS_BY_FORMAT = {
  MP4: [12, 24, 30, 60],
  GIF: [8, 12, 15, 24, 30],
} as const satisfies Record<VideoFormat, readonly number[]>;

export const DEFAULT_FPS: Record<VideoFormat, number> = {
  MP4: 30,
  GIF: 15,
};

export const QUALITY_OPTIONS: readonly VideoQuality[] = ['LOW', 'MEDIUM', 'HIGH'];

/** The only scales Figma's export accepts. Typed against the contract's union so a value
 *  outside it cannot be added here without a compile error. */
export const SCALE_VALUES: readonly VideoScale[] = [0.5, 0.75, 1, 1.5, 2, 3, 4];

/**
 * Snaps an arbitrary fps onto the set the format actually accepts. Generic over the format so
 * the result is that format's literal union -- the sandbox can hand it straight to
 * `exportAsync` without asserting anything.
 *
 * A value already in the set is returned unchanged by the reduce, so there is no separate
 * pass-through branch (one would be dead code). Non-finite input keeps the seed, i.e. the
 * documented default.
 */
export function clampFps<F extends VideoFormat>(
  format: F,
  fps: number
): (typeof FPS_BY_FORMAT)[F][number] {
  const allowed: readonly number[] = FPS_BY_FORMAT[format];
  const chosen = allowed.reduce(
    (best, candidate) => (Math.abs(candidate - fps) < Math.abs(best - fps) ? candidate : best),
    DEFAULT_FPS[format]
  );
  // The candidates are exactly this format's list (or its default, which is in that list).
  return chosen as (typeof FPS_BY_FORMAT)[F][number];
}

/** Only MP4 takes a quality preset; GIF has a loop count instead. */
export function supportsQuality(format: VideoFormat): boolean {
  return format === 'MP4';
}

/** Kept here rather than inline in the UI so the filename/MIME pairing is testable: a wrong
 *  pair ships a corrupt file with a plausible name and extension. */
export function videoMime(format: VideoFormat): string {
  return format === 'GIF' ? 'image/gif' : 'video/mp4';
}

export function videoExtension(format: VideoFormat): string {
  return format === 'GIF' ? 'gif' : 'mp4';
}
