# NodePeeker

> A fast, zero-subscription Figma plugin replacing paid Dev Mode for free accounts. Get instant Tailwind CSS classes, pure CSS declarations, an interactive visual box model, quick color copying, 1-click asset exports, MP4/GIF animation export, and an integrated **Local MCP Server** feeding design data directly into **Cursor**, **Antigravity IDE**, and **pi.dev**.

**English** | [Tiếng Việt](README.vi.md)

[![Figma Plugin API](https://img.shields.io/badge/Figma_Plugin_API-v1.0.0-1abc9c.svg)](https://www.figma.com/plugin-docs/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-7.0-646cff.svg)](https://vitejs.dev/)
[![MCP Server](https://img.shields.io/badge/MCP-Streamable_HTTP-blueviolet.svg)](#-local-mcp-bridge-cursor-antigravity-ide-pidev)

---

## Table of Contents

- [Features](#-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Quick Start & Build Commands](#-quick-start--build-commands)
- [Step-by-Step Installation in Figma](#-step-by-step-installation-in-figma)
- [Local MCP Bridge (Cursor, Antigravity IDE, pi.dev)](#-local-mcp-bridge-cursor-antigravity-ide-pidev)
  - [Why NodePeeker MCP?](#why-nodepeeker-mcp)
  - [Step 1: Start the MCP Broker](#step-1-start-the-mcp-broker)
  - [Step 2: Connect Figma Plugin to Broker](#step-2-connect-figma-plugin-to-broker)
  - [Step 3: Configure Your AI Assistant](#step-3-configure-your-ai-assistant)
    - [Cursor Configuration](#1-cursor)
    - [Antigravity IDE Configuration](#2-antigravity-ide)
    - [pi.dev Configuration](#3-pidev)
  - [Available MCP Tools](#available-mcp-tools)
- [Troubleshooting MCP](#-troubleshooting-mcp)
- [Project Structure](#-project-structure)
- [License](#-license)

---

## 🚀 Features

### 💻 Inspect Code Viewer (Web & Mobile)
- **Web & Mobile First:** Seamlessly switch between **Pure CSS**, **Tailwind CSS**, **React Native (StyleSheet)**, **Flutter (Dart BoxDecoration / TextStyle)**, **iOS (SwiftUI modifiers)**, and **Android (Jetpack Compose Modifier)**.
- **Syntax Highlighting:** Real-time token highlighting for properties, values, units, hex colors, and Tailwind utility categories.
- **Tailwind CSS Generation:** Easily toggle to Tailwind utility classes with color-coded token badges. Real values are emitted rather than arbitrary presets: custom shadows (`shadow-[0px_4px_8px_2px_rgba(0,0,0,0.25)]`), line-height and letter-spacing (`leading-*` / `tracking-*`), auto-layout Hug sizing (`w-fit` / `h-fit`), stretch (`self-stretch`), and absolute positioning (`absolute` + `left-[…]` / `top-[…]`).
- **Mobile Code Transpilers:**
  - **React Native:** Emits clean `StyleSheet.create({ container: { ... } })` with flex layout, dimensions, and padding.
  - **Flutter:** Generates `Container` with `BoxDecoration` (`color: const Color(0x...)`, `borderRadius`, `BoxShadow`) or `TextStyle`.
  - **SwiftUI:** Generates chained modifiers (`.frame()`, `.padding()`, `.background()`, `.cornerRadius()`).
  - **Jetpack Compose:** Generates `Modifier.size()`, `.padding()`, `.background()`, and `RoundedCornerShape()`.
- **SVG Markup & Visual Preview:** Switch to the SVG tab to inspect raw vector code or view a live SVG preview board on a checkerboard background before copying or downloading.
- **In-Plugin Shortcuts:** Press `1` or `C` for CSS, `2` or `T` for Tailwind, `3` or `S` for SVG, and `Ctrl+C` / `Cmd+C` to copy active code.

### 🎨 Quick Color Copier (Web & Mobile Formats)
- **Automatic Palette Detection:** Extracts solid fills and strokes applied to the selected layer and its immediate children.
- **Multi-Format Conversion:** Toggle effortlessly between **HEX**, **8-digit HEXA (alpha)**, **RGB**, **HSL**, **ARGB (Flutter / Android `Color(0xAARRGGBB)`)**, and **Swift (SwiftUI `Color(...)`)**.
- **Single-Click Copying:** Click any color badge or swatch to copy formatted values to your clipboard.

### 📦 Visual Box Model
- **Interactive Diagram:** Outer dimensions ($W \times H$), 4-sided padding (Top, Right, Bottom, Left), auto-layout gaps, and corner radii.
- **Click-to-Copy:** Click on any dimension or padding metric to copy its exact pixel value directly.

### 📏 Measure Distance
- **Select Exactly Two Layers:** The inspector automatically switches to a distance panel displaying the horizontal gap, vertical gap, edge-to-edge distance, and spatial direction (`Button is to the right of Card`).
- **Alignment & Overlap:** Detects edge alignments (top, bottom, left, right, center lines) within half-pixel precision and surfaces intersection overlaps when layers overlap.

### ⚡ 1-Click Asset Export & Mobile Density Bundles
- **Copy SVG:** Copies raw, optimized SVG markup straight into your clipboard for direct JSX/HTML pasting.
- **Save SVG:** One-click download of SVG vector assets without digging through Figma's nested menus.
- **Save PNG @2x:** Exports high-resolution raster image files instantly.
- **iOS Asset Catalog (.zip):** 1-Click download of a ready-to-use `.imageset` archive containing `@1x`, `@2x`, and `@3x` PNGs plus Xcode's `Contents.json` metadata (drag-and-drop straight into `Assets.xcassets`).
- **Android Resource Bundle (.zip):** 1-Click download of a multi-density archive with `res/drawable-mdpi` (1x), `drawable-hdpi` (1.5x), `drawable-xhdpi` (2x), `drawable-xxhdpi` (3x), and `drawable-xxxhdpi` (4x).
- **Zero Heavy Dependencies:** Uses a custom store-only ZIP builder with zero third-party bundle bloat.

### 🎬 Animation Export (MP4 / GIF)
- **Layer & Top-Level Frame Export:** Export keyframe animations, video fills, and Motion timelines as MP4 or animated GIF.
- **Fine-Grained Controls:** Choose 12/24/30/60 fps for MP4 with quality presets (Low, Medium, High) or 8/12/15/24/30 fps for GIF with loop count control (`∞` or fixed loops).

### 🤖 Built-in MCP Server (Cursor & Antigravity IDE)
- Integrated Bridge Service streams design context to your favorite AI code assistants using the open **Model Context Protocol (MCP)** standard without burning official Figma seat quotas.

### 🌓 Native Figma Theme Integration
- Uses Catppuccin color palette tokens (Latte in light mode, Mocha in dark mode) and dynamically synchronizes with Figma's native theme.

---

## 🏗️ Architecture & Tech Stack

```
   ┌────────────────────────────────────────────────────────┐
   │                   Figma Canvas                         │
   └───────────────────────────┬────────────────────────────┘
                               │ figma.on("selectionchange")
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │  Figma Sandbox (src/code/code.ts)                      │
   │  - Scene-graph reader & extractors (extractors.ts)     │
   │  - Color math & conversions (color-utils.ts)           │
   │  - Bridge Service: HTTP polling & pushes to broker     │
   └───────────────┬────────────────────────┬───────────────┘
                   │ postMessage            │ HTTP :3939
                   ▼                        ▼
┌──────────────────────────────┐ ┌──────────────────────────────────┐
│  React UI (src/ui/App.tsx)   │ │  MCP Broker (bridge/broker.ts)   │
│  - Tailwind + Lucide Icons   │ │  - Streamable HTTP Transport     │
│  - Box Model & Code Viewer   │ │  - Cached design snapshots       │
│  - Bridge Settings Modal     │ │  - Zero seat-quota consumption   │
│  - Bundled single dist/index │ └──────────────────┬───────────────┘
└──────────────────────────────┘                    │
                                     MCP Protocol   ▼
                                  ┌───────────────────────────────┐
                                  │ Cursor / Antigravity / pi.dev │
                                  └───────────────────────────────┘
```

- **Figma Plugin API**: Interacts with the canvas document model safely without modifying user undo history.
- **React 18 + TypeScript**: Single-file bundled UI running in an isolated iframe.
- **Tailwind CSS (Catppuccin)**: Semantic theme tokens reacting to Figma's light/dark modes.
- **Streamable HTTP MCP**: Standards-compliant MCP transport over `http://127.0.0.1:3939/mcp`.

---

## ⚡ Quick Start & Build Commands

### Prerequisites
- Node.js ≥ 18.0.0
- npm ≥ 9.0.0
- Figma Desktop App

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/hongducdev/nodepeeker.git
cd nodepeeker
npm install
```

### 2. Available Scripts

| Command | Description |
|---|---|
| `npm run build` | **Full build:** Compiles sandbox (`dist/code.js`) and UI (`dist/index.html`). |
| `npm run build:code` | Compiles sandbox TypeScript code via esbuild into `dist/code.js`. |
| `npm run build:ui` | Bundles React UI into a single self-contained `dist/index.html`. |
| `npm run bridge` | **Builds and starts the local MCP broker** on `127.0.0.1:3939`. |
| `npm run bridge:build` | Compiles `bridge/broker.ts` into `bridge/dist/broker.mjs`. |
| `npm run update` | **One-click updater:** Pulls latest code, updates dependencies, and rebuilds plugin + broker. |
| `npm test` | Runs the full Vitest unit & integration test suite (23 test files). |
| `npm run typecheck` | Checks TypeScript types without emitting files (`tsc --noEmit`). |
| `npm run watch:code` | Watches and rebuilds sandbox code on change. |
| `npm run dev:ui` | Starts a Vite dev server for browser UI styling at `http://localhost:5173`. |

---

## 🔌 Step-by-Step Installation in Figma

1. **Build the plugin**:
   ```bash
   npm run build
   ```
   Ensure that `dist/code.js` and `dist/index.html` exist.

2. **Open Figma Desktop**:
   Open any design file or draft.

3. **Import Plugin from Manifest**:
   - Click the top-left Figma menu (or press `Ctrl + /` on Windows / `Cmd + /` on Mac).
   - Navigate to **Plugins > Development > Import plugin from manifest...**.
   - Select the `manifest.json` file located in the root of this project.

4. **Launch NodePeeker**:
   - Right-click canvas -> **Plugins > Development > NodePeeker** (or press `Ctrl + Alt + P` / `Cmd + Option + P`).

---

## 🤖 Local MCP Bridge (Cursor, Antigravity IDE, pi.dev)

### Why NodePeeker MCP?

Figma's official MCP server is capped by **seat** (20 tool calls per month on Starter plans). NodePeeker bypasses this limit by routing queries locally through Figma's Plugin API:
- **Unlimited tool calls:** No seat limits, no extra subscription.
- **Real-time synchronization:** Selection changes in Figma push directly to the local broker.
- **Token-budget views:** Returns compact `summary` (~60 tokens), `tailwind` (~120 tokens), `css` (~400 tokens), or `full` inspection data.

---

### Step 1: Start the MCP Broker

In your terminal, run:
```bash
npm run bridge
```

The broker will print its connection information and access token:
```text
  NodePeeker Bridge broker
  MCP   http://127.0.0.1:3939/mcp
  token 0R4_GbTaT7oH5Y7B4E-Sjn0dv4n-CDKT

  Cursor / pi.dev config:
    { "url": "http://127.0.0.1:3939/mcp",
      "headers": { "X-Bridge-Token": "0R4_GbTaT7oH5Y7B4E-Sjn0dv4n-CDKT" } }
```

> **Note:** The token is generated automatically on first run and stored locally in `bridge/.token` (gitignored). Keep this terminal running while using AI assistants.

---

### Step 2: Connect Figma Plugin to Broker

1. In Figma, open the **NodePeeker** plugin.
2. Click the **MCP (Bot)** icon on the header (or click **SETTINGS** on the start screen).
3. Paste the token printed by the broker and click **Save & Connect**.
4. The indicator turns **Green (Connected)**.
5. ⚠️ **Keep the NodePeeker plugin window open** while chatting with your AI assistant.

---

### Step 3: Configure Your AI Assistant

#### 1. Cursor

Cursor supports Streamable HTTP MCP servers via config files or UI settings:

**Option A: Global Configuration (Recommended)**
Add to `~/.cursor/mcp.json` (`C:\Users\<YourUsername>\.cursor\mcp.json` on Windows):

```json
{
  "mcpServers": {
    "nodepeeker": {
      "url": "http://127.0.0.1:3939/mcp",
      "headers": {
        "X-Bridge-Token": "<YOUR_TOKEN_HERE>"
      }
    }
  }
}
```

**Option B: Project Configuration**
Add `.cursor/mcp.json` to the root of any project you open in Cursor.

**Verify in Cursor:**
Open **Cursor Settings** (`Ctrl + ,`) -> **Features** -> **MCP Servers**. You should see `nodepeeker` with a green indicator.

---

#### 2. Antigravity IDE

Antigravity IDE natively uses Streamable HTTP transport configured in its global MCP config file.

**Configuration File:**
Edit `~/.gemini/config/mcp_config.json` (`C:\Users\<YourUsername>\.gemini\config\mcp_config.json` on Windows):

```json
{
  "mcpServers": {
    "nodepeeker": {
      "serverUrl": "http://127.0.0.1:3939/mcp",
      "headers": {
        "X-Bridge-Token": "<YOUR_TOKEN_HERE>"
      }
    }
  }
}
```

> **Note:** Antigravity IDE uses the key `"serverUrl"` (instead of `"url"`).

**Verify in Antigravity IDE:**
1. Restart Antigravity IDE (to reload language server configs).
2. Go to **Additional Options (...) > MCP Servers** in the chat sidebar.
3. You will see `nodepeeker` active with its tools ready.

---

#### 3. pi.dev

Add to `~/.config/mcp/mcp.json`:

```json
{
  "mcpServers": {
    "nodepeeker": {
      "url": "http://127.0.0.1:3939/mcp",
      "headers": {
        "X-Bridge-Token": "<YOUR_TOKEN_HERE>"
      }
    }
  }
}
```

---

### Available MCP Tools

Once connected, your AI assistant can use the following tools:

| Tool | Parameters | Description |
|---|---|---|
| `nodepeeker_status` | _none_ | Checks if NodePeeker is connected in Figma and returns the active file name and file key. |
| `nodepeeker_get_selection` | `view?: "summary" \| "tailwind" \| "css" \| "react-native" \| "flutter" \| "swiftui" \| "compose" \| "full"` | Returns design inspection data for the currently selected layer on Figma canvas in web or mobile formats. |
| `nodepeeker_get_node` | `nodeId: string`, `view?: "summary" \| "tailwind" \| "css" \| "react-native" \| "flutter" \| "swiftui" \| "compose" \| "full"` | Inspects any specific layer by its Figma ID (e.g., `"1:2"` or `"1-2"`), including child component hierarchy. |

#### Example Prompts for AI Chat:
- *"Check if Figma is connected and what file is open."*
- *"Look at the layer I currently have selected in Figma and generate a React Tailwind component for it."*
- *"Generate a Flutter Container widget for the selected Figma layer."*
- *"Generate React Native StyleSheet code for the current Figma selection."*
- *"Inspect node 349:399 in Figma and extract its color scheme and typography."*

---

## 🛠️ Troubleshooting MCP

| Issue | Cause | Fix |
|---|---|---|
| `PLUGIN_DISCONNECTED` error in Cursor / Antigravity | The plugin window in Figma was closed or minimized. | **Figma terminates plugins when their window is closed.** Open NodePeeker in Figma (`Ctrl+Alt+P`) and keep the window open on the canvas. |
| Status shows `NEEDS TOKEN` in Figma | Token was not saved yet in Figma client storage. | Copy the token from terminal (`npm run bridge`), click the MCP icon in NodePeeker, paste it, and click **Save & Connect**. |
| `401 Unauthorized` | Missing or incorrect `X-Bridge-Token` header in client config. | Ensure the token in your AI assistant config matches the one in `bridge/.token`. |
| Connection drops when switching windows | Background throttling in Electron/Figma. | NodePeeker uses an extended 30-second TTL. If it stutters, right-click the plugin window and select **Reload plugin** (`Ctrl + R`). |
| Antigravity IDE does not show tools | Antigravity was not restarted after editing `mcp_config.json`. | Restart Antigravity IDE so its Language Server re-reads global MCP configs. |

---

## 📁 Project Structure

```
figma-dev-mod/
├── src/
│   ├── code/                      # Figma sandbox thread (DOM-free)
│   │   ├── bridge-service.ts      # Integrated Bridge service (polling & pushes)
│   │   ├── code.ts                # Main plugin lifecycle & message router
│   │   ├── color-utils.ts         # HEX, RGB, HSL conversions
│   │   ├── extractors.ts          # Box model, fills, typography & border extractor
│   │   └── video-frame.ts         # Animation and video frame detection
│   ├── types/
│   │   └── messages.ts            # Shared bidirectional messaging contracts
│   ├── ui/                        # React UI iframe thread
│   │   ├── components/            # UI components (+ BridgeSettingsModal.tsx)
│   │   ├── hooks/                 # Custom React hooks (theme, clipboard)
│   │   ├── App.tsx                # Main UI root component
│   │   ├── index.html             # Vite entry HTML
│   │   └── styles.css             # Tailwind CSS & Catppuccin theme variables
│   └── utils/
│       ├── distance.ts            # Pair measurement geometry
│       ├── node-link.ts           # Deep link URL builder
│       ├── tailwind-scale.ts      # Spacing, radius & font size scales
│       ├── tailwind-transpiler.ts # CSS-to-Tailwind transpiler engine
│       └── video-options.ts       # Video export FPS & quality presets
├── bridge/                        # MCP Broker (Node.js backend for AI agents)
│   ├── broker.ts                  # Streamable HTTP MCP server (:3939)
│   ├── protocol.ts                # Wire protocol & types
│   ├── state.ts                   # Snapshot cache & command queue
│   ├── project.ts                 # Projection views (summary, tailwind, css, full)
│   └── fake-plugin.mjs            # Standalone protocol test harness
├── tests/                         # 22 Vitest test suites (222 tests - 100% pass)
├── dist/                          # Compiled plugin bundle (dist/code.js, dist/index.html)
├── manifest.json                  # Figma plugin manifest
├── package.json                   # Scripts & dependencies
├── tailwind.config.js             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript compiler settings
└── vite.config.ts                 # Vite single-file bundler config
```

---

## 📄 License

MIT License. Free for personal and commercial use.
