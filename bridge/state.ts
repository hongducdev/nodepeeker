import {
  DEFAULT_TIMEOUT_MS,
  PLUGIN_TTL_MS,
  type CommandResult,
  type CommandType,
  type PluginCommand,
  type PluginHello,
  type PluginStatus,
  type SelectionPush,
} from './protocol';

interface Pending {
  command: PluginCommand;
  resolve: (result: CommandResult) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * All broker-side state, with no HTTP and no MCP in it.
 *
 * Split out so the parts that are easy to get wrong — the staleness guard, command
 * timeouts, and one-shot delivery — are testable in plain Node, without Figma and without
 * standing up a server. `broker.ts` is then a thin transport over this.
 */
export class BridgeState {
  private hello: PluginHello | null = null;
  private lastSeenAt: number | null = null;

  /** Highest `seq` accepted. Starts below any real sequence so seq 0 is valid. */
  private lastSeq = -1;
  private snapshot: SelectionPush | null = null;
  private snapshotAt: number | null = null;

  private readonly queue: PluginCommand[] = [];
  private readonly pending = new Map<string, Pending>();
  private nextId = 1;

  // ---- plugin → broker -----------------------------------------------------

  registerPlugin(hello: PluginHello): void {
    this.hello = hello;
    this.lastSeenAt = Date.now();
  }

  /**
   * Returns false when the push is stale and was dropped.
   *
   * This is the wire-level version of the `selectionSequence` guard in `src/code/code.ts`:
   * a slow extraction from an earlier selection must never overwrite a newer one. Drops are
   * silent by design — the plugin is fire-and-forget, exactly like its `selectionchange` handler.
   */
  pushSelection(push: SelectionPush): boolean {
    this.lastSeenAt = Date.now();
    if (push.seq <= this.lastSeq) return false;

    this.lastSeq = push.seq;
    this.snapshot = push;
    this.snapshotAt = this.lastSeenAt;
    return true;
  }

  /** A push carrying only liveness (no selection change) still refreshes the TTL. */
  touch(): void {
    this.lastSeenAt = Date.now();
  }

  settle(result: CommandResult): boolean {
    const entry = this.pending.get(result.id);
    if (!entry) return false;

    clearTimeout(entry.timer);
    this.pending.delete(result.id);
    entry.resolve(result);
    return true;
  }

  /** Drains the queue. Each command is delivered exactly once. */
  takeCommands(): PluginCommand[] {
    return this.queue.splice(0, this.queue.length);
  }

  // ---- reads ---------------------------------------------------------------

  getSnapshot(): SelectionPush | null {
    return this.snapshot;
  }

  status(): PluginStatus {
    const now = Date.now();
    const connected = this.lastSeenAt !== null && now - this.lastSeenAt < PLUGIN_TTL_MS;
    return {
      connected,
      fileName: this.hello?.fileName ?? null,
      fileKey: this.hello?.fileKey ?? null,
      lastSeenAt: this.lastSeenAt,
      // Age is reported even while connected, so a stuck plugin is visible rather than implied.
      snapshotAgeMs: this.snapshotAt === null ? null : now - this.snapshotAt,
    };
  }

  // ---- broker → plugin -----------------------------------------------------

  /**
   * Queues a command and resolves with the plugin's answer, or a TIMEOUT.
   *
   * Fails fast when the plugin is absent instead of waiting out the timeout — an agent that
   * forgot to open the plugin should be told immediately, not after eight seconds.
   */
  requestCommand(
    type: CommandType,
    params: Record<string, unknown> = {},
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ): Promise<CommandResult> {
    if (!this.status().connected) {
      return Promise.resolve({
        id: 'n/a',
        ok: false,
        error: {
          code: 'PLUGIN_DISCONNECTED',
          message:
            'The NodePeeker plugin is not running or disconnected in Figma. Open it via Plugins → Development → NodePeeker and keep the plugin window open.',
        },
      });
    }

    const command: PluginCommand = { id: `cmd_${this.nextId++}`, type, params, timeoutMs };

    return new Promise<CommandResult>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(command.id);
        resolve({
          id: command.id,
          ok: false,
          error: { code: 'TIMEOUT', message: `The plugin did not answer ${type} within ${timeoutMs}ms.` },
        });
      }, timeoutMs);

      this.pending.set(command.id, { command, resolve, timer });
      this.queue.push(command);
    });
  }

  /** Aborts every in-flight command. Called on shutdown so nothing hangs. */
  dispose(): void {
    for (const [, entry] of this.pending) clearTimeout(entry.timer);
    this.pending.clear();
    this.queue.length = 0;
  }
}
