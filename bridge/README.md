# NodePeeker Bridge

A local MCP server that feeds Figma design data to **Cursor** and **pi.dev** without spending
Figma's official MCP quota.

The problem it solves: Figma's official MCP server is capped by *seat*, not by client. On a
Starter plan with a View seat that is **20 tool calls per month**, and adding a second client
does not add quota — both clients authenticate as the same user and share one bucket. The
bridge routes volume through the Plugin API instead, where there is no such cap.

**Read-only.** It inspects; it never writes to a Figma document.

---

## Quick start

```bash
npm run bridge:build      # once, or after changing bridge/*.ts
npm run bridge            # start the broker — prints the token
```

Then in Figma Desktop:

1. **Plugins → Development → Import plugin from manifest…** → `bridge/plugin/manifest.json`
2. Run **NodePeeker Bridge**
3. Paste the token the broker printed → **Save & connect**

The panel badge should read **CONNECTED**. Build the plugin first if you have not:
`npm run bridge:plugin`.

Verify without Figma at any time — this drives the same protocol from plain Node:

```bash
node bridge/fake-plugin.mjs
```

---

## Client configuration

The token lives in `bridge/.token` (generated on first run, gitignored).

**pi.dev** — `~/.config/mcp/mcp.json` (pi's shared, tool-agnostic config):

```json
{
  "mcpServers": {
    "nodepeeker": {
      "url": "http://127.0.0.1:3939/mcp",
      "headers": { "X-Bridge-Token": "${NODEPEEKER_BRIDGE_TOKEN}" }
    }
  }
}
```

**Cursor** — `~/.cursor/mcp.json`, same block.

Both clients can point at the same broker at the same time; it is one process serving both.

> **Server name matters.** Use `nodepeeker`, not `figma`. Both clients namespace tools by server
> name, so naming it `figma` would collide with the official server's `figma_get_design_context`.
> `nodepeeker_get_selection` cannot collide with anything.

---

## Tools

Nine were designed; three ship in this phase.

| Tool | Params | Purpose |
|---|---|---|
| `status` | — | Is the plugin connected, and which file is open. Call first. |
| `get_selection` | `view?` | The current selection, served from the pushed snapshot. |
| `get_node` | `nodeId`, `view?` | One node by id, regardless of selection. |

### `view` is the token budget

| `view` | Returns | ~tokens |
|---|---|---|
| `summary` *(default)* | id, name, type, size, layout, padding, gap, radius | ~60 |
| `tailwind` | one class string, via NodePeeker's own transpiler | ~120 |
| `css` | the CSS map | ~400 |
| `full` | complete `NodeInspectionData` | 1200–4000 |

Default to `summary`. Escalate deliberately.

---

## How it works

```
Cursor ─┐
        ├── MCP (HTTP :3939/mcp) ──► broker ──► bridge plugin (Figma Desktop)
pi.dev ─┘                              │
                                       └── cache: selection snapshot
```

The plugin **pushes** on `figma.on('selectionchange')`, so `get_selection` normally answers from
broker memory with no round-trip. `get_node` goes the other way: the broker queues a command, the
plugin picks it up on its next 300 ms poll, and the reply resolves the waiting MCP call.

Four decisions worth knowing before changing anything:

- **HTTP, not WebSocket.** Figma documents `http://localhost` in `devAllowedDomains`; it never
  documents `ws://`. The spike in `../figma-bridge-spike/` exists to settle that question — until
  it does, HTTP is the only transport with evidence behind it.
- **Projection is broker-side.** The plugin always sends one complete payload; `summary` /
  `tailwind` / `css` are pure functions over it (`project.ts`). One extraction path, so views
  cannot drift from each other or from the plugin panel.
- **The staleness guard is on the wire.** `BridgeState.pushSelection` drops any `seq` that is not
  newer than the last accepted one — the same guarantee `src/code/code.ts` makes in-process, for
  the same reason: a slow extraction from an old selection must not overwrite a newer one.
- **Sessions are stateful.** A fresh MCP server per request cannot remember the `initialize`
  handshake, so `tools/call` would be rejected as un-initialized. One session per client.

### Files

| File | Role |
|---|---|
| `protocol.ts` | Plugin ⇄ broker wire contract. No Figma, no Node. |
| `state.ts` | Cache, staleness guard, command queue, timeouts. Pure — no HTTP. |
| `project.ts` | `NodeInspectionData` → `summary` / `tailwind` / `css` / `full`. Pure. |
| `broker.ts` | HTTP + MCP. Thin transport over the three above. |
| `plugin/` | The Figma plugin. Reuses `src/code/extractors.ts`. |
| `fake-plugin.mjs` | Same protocol in plain Node — the reason this is testable. |

---

## Security

The broker answers `Access-Control-Allow-Origin: *` because the plugin's iframe origin is `null`
and nothing else can work. That means **any website you have open could reach it**. Hence:

- a shared token, required on every route including `/mcp`
- bound to `127.0.0.1` only
- no cookies (a null origin cannot use them anyway)

The token is the whole control. Do not disable it.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Panel stuck on `NEEDS TOKEN` | Paste the token the broker printed |
| Panel `DISCONNECTED`, broker log empty | CSP blocked the request — check the Figma plugin console, and see `../figma-bridge-spike/` |
| `PLUGIN_DISCONNECTED` from a tool | The plugin is not running, or not connected |
| `TIMEOUT` from `get_node` | The plugin is connected but its poll loop is stuck |
| Cursor/pi show no tools | Wrong server name, missing token, or the broker is not running |

`status` answers most of these directly.

---

## Not in this phase

`search_nodes`, `resolve_url`, `get_svg`, `get_screenshot`, `get_variables`, and the REST tier.
An agent currently needs a node id it already knows, or the user's current selection. See
`../figma-bridge-spike/DESIGN.md` for the full surface.
