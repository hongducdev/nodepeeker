/**
 * Wire contract between the bridge plugin (Figma sandbox) and the broker (Node).
 *
 * Mirrors the discipline of `src/types/messages.ts`: the sandbox and the broker compile this
 * independently, so it is the single source of truth for the plugin ⇄ broker boundary and
 * contains no Figma and no Node specifics.
 *
 * Three flows:
 *   plugin → broker   hello / push / result   (plugin-initiated)
 *   broker → plugin   commands                (pulled by the plugin)
 *   broker → client   MCP tools               (Cursor / pi.dev)
 */

/** What an agent can ask the plugin to do. Phase 1 ships the first two. */
export type CommandType = 'GET_SELECTION' | 'GET_NODE';

/**
 * How much of a node to return. Projection happens **broker-side**, so the plugin always
 * sends one complete payload and the cheap views are pure functions over it — testable
 * without Figma, and impossible to drift between views.
 */
export type ViewName = 'summary' | 'tailwind' | 'css' | 'full';

export const VIEW_NAMES: readonly ViewName[] = ['summary', 'tailwind', 'css', 'full'];

export interface PluginHello {
  fileName: string | null;
  fileKey: string | null;
  capabilities: string[];
}

export interface SelectionPush {
  /** Monotonic per plugin session. The broker drops anything not newer than the last. */
  seq: number;
  kind: 'single' | 'pair' | 'none';
  count: number;
  pushedAt: number;
  /** Always the full inspection payload; the broker projects it down per `view`. */
  data?: unknown;
}

export interface PluginCommand {
  id: string;
  type: CommandType;
  params: Record<string, unknown>;
  timeoutMs: number;
}

export type BridgeErrorCode =
  | 'PLUGIN_DISCONNECTED'
  | 'NODE_NOT_FOUND'
  | 'NO_SELECTION'
  | 'TIMEOUT'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'INTERNAL';

export interface CommandResult {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: { code: BridgeErrorCode; message: string };
}

/** Broker-side view of the plugin's liveness. */
export interface PluginStatus {
  connected: boolean;
  fileName: string | null;
  fileKey: string | null;
  lastSeenAt: number | null;
  snapshotAgeMs: number | null;
}

/** A plugin is considered gone if it has not spoken for this long (30s accommodates background window throttling). */
export const PLUGIN_TTL_MS = 30_000;

/** How long the plugin waits between command polls. */
export const POLL_INTERVAL_MS = 300;

export const DEFAULT_TIMEOUT_MS = 8_000;
