/**
 * Types for `fake-plugin.mjs`.
 *
 * The implementation stays `.mjs` so it runs with a bare `node bridge/fake-plugin.mjs` — no
 * build step, which is what makes it usable as a manual debugging tool. This declaration gives
 * the integration test real types without forcing a compile.
 */

export declare const DEFAULT_PORT: number;

export declare const FIXTURE: Record<string, unknown>;

export declare function readToken(tokenPath?: string): string;

export interface FakePluginHandle {
  /** Pushes a selection snapshot. Resolves to whether the broker accepted it. */
  push: (opts?: { kind?: string; count?: number; data?: unknown }) => Promise<boolean>;
  /** Sequence numbers the broker accepted, in order. */
  accepted: number[];
  /** Sequence numbers the broker dropped as stale, in order. */
  dropped: number[];
  stop: () => void;
}

export declare function startFakePlugin(options?: {
  port?: number;
  token?: string;
  host?: string;
  log?: (message: string) => void;
}): Promise<FakePluginHandle>;
