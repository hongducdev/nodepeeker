# NodePeeker

> A fast, zero-subscription Figma plugin replacing paid Dev Mode for free accounts. Get instant Tailwind CSS classes, pure CSS declarations, an interactive visual box model, quick color copying, and 1-click asset exports.

[![Figma Plugin API](https://img.shields.io/badge/Figma_Plugin_API-v1.0.0-1abc9c.svg)](https://www.figma.com/plugin-docs/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg)](https://vitejs.dev/)
[![Offline Safe](https://img.shields.io/badge/Offline-100%25_Safe-success.svg)](#privacy--offline-security)

---

## Features

### 💻 Inspect Code Viewer (Default: Pure CSS)
- **Pure CSS First:** Automatically displays standard, clean CSS declarations by default with live color chips, line numbers, and formatted rules ready to paste.
- **Syntax Highlighting:** Real-time token highlighting for properties, values, units, hex colors, and Tailwind utility categories.
- **Tailwind CSS Generation:** Easily toggle to Tailwind utility classes with color-coded token badges. The output carries the layer's **real** values rather than presets: shadows are emitted as arbitrary `shadow-[0px_4px_8px_2px_rgba(0,0,0,0.25)]` utilities (never a rounded `shadow-md` name), text line-height and letter-spacing become `leading-*` / `tracking-*`, Hug-sized frames map to `w-fit` / `h-fit`, stretched children to `self-stretch`, absolutely positioned layers to `absolute` plus `left-[…]` / `top-[…]` offsets, and node opacity to `opacity-*`.
- **SVG Markup:** Switch to the SVG tab for the layer's exported markup, with element and attribute names highlighted and hex fills shown as live color swatches.
- **Keyboard Shortcuts:** Press `1` or `C` for CSS, `2` or `T` for Tailwind, `3` or `S` for SVG, and `Ctrl+C` / `Cmd+C` to copy active code.
- **Quick Launch in Figma:** Press `Ctrl+Alt+P` (Windows) / `Cmd+Option+P` (Mac) to re-run the plugin from anywhere on canvas, or `Shift+I` to pick from the Plugins drawer.

### 🎨 Quick Color Copier
- **Automatic Palette Detection:** Extracts all solid fills and strokes applied to the selected layer.
- **Multi-Format Conversion:** Toggle effortlessly between **HEX**, **RGB**, and **HSL** color spaces.
- **Single-Click Copying:** Click any color badge or swatch to immediately copy the formatted value to your clipboard.

### 📦 Visual Box Model
- **Interactive Diagram:** Clear visual representation of the selected element's box model including outer dimensions ($W \times H$), 4-sided padding (Top, Right, Bottom, Left), auto-layout gaps, and corner radii.
- **Click-to-Copy:** Click on any dimension or padding metric to copy its exact pixel value directly.

### ⚡ 1-Click Asset Export
- **Copy SVG:** Copies raw, optimized SVG markup straight into your clipboard for direct JSX/HTML pasting.
- **Save SVG:** One-click download of SVG vector assets without opening Figma's nested export drawer.
- **Save PNG @2x:** Exports high-resolution raster image files instantly.

### 🌓 Native Figma Theme Integration
- Automatically matches Figma's interface theme (Light & Dark modes) using native `figma.ui.themeColors`.

### 🛡️ Privacy & Offline Security
- **No External Requests:** Strictly configured with `"allowedDomains": ["none"]` in `manifest.json`.
- **Zero Telemetry:** No analytics, trackers, or remote server dependencies. Everything executes 100% locally.

---

## Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│                   Figma Canvas                         │
└──────────────────────────┬─────────────────────────────┘
                           │ figma.on("selectionchange")
                           ▼
┌────────────────────────────────────────────────────────┐
│  Figma Sandbox Backend (src/code/code.ts)               │
│  - Layer property extractors (extractors.ts)           │
│  - Color math & conversions (color-utils.ts)           │
│  - Bundled into dist/code.js via esbuild               │
└──────────────────────────┬─────────────────────────────┘
                           │ postMessage({ type: 'SELECTION_CHANGE', ... })
                           ▼
┌────────────────────────────────────────────────────────┐
│  Plugin UI (src/ui/App.tsx)                            │
│  - React 18 + TypeScript                               │
│  - Tailwind CSS + Lucide Icons                         │
│  - Tailwind transpiler engine (tailwind-transpiler.ts) │
│  - Bundled into a single dist/index.html (Vite)        │
└────────────────────────────────────────────────────────┘
```

- **Figma Plugin API**: Interacts with the canvas document model through safe, sandboxed APIs.
- **React 18**: Reactive UI components with performant state management and hooks.
- **Tailwind CSS & PostCSS**: Compact, responsive design system mimicking Figma's native look and feel.
- **Lucide Icons (`lucide-react`)**: Clean, accessible developer iconography.
- **Vite & `vite-plugin-singlefile`**: Bundles the entire React application (HTML, CSS, JavaScript) into a single, self-contained `dist/index.html` file required by Figma's iframe sandbox.
- **esbuild**: Rapid bundling of the TypeScript sandbox backend into `dist/code.js`.
- **Vitest**: Fast test runner for extraction logic and Tailwind transpiler rules.

---

## Quick Start & Build Commands

### Prerequisites
- Node.js v18.0.0+
- npm v9.0.0+
- Figma Desktop App

### Installation

```bash
# Clone repository
git clone https://github.com/your-username/nodepeeker.git
cd nodepeeker

# Install dependencies
npm install
```

### Build Commands

| Command | Description |
|---|---|
| `npm run build` | Builds both the backend code (`dist/code.js`) and UI singlefile (`dist/index.html`). |
| `npm run test` | Runs the test suite via Vitest. |
| `npm run dev:ui` | Starts a Vite dev server for browser-based UI development and styling. |
| `npm run watch:code` | Watches and rebuilds `src/code/code.ts` via esbuild on file changes. |
| `npm run build:code` | Compiles the Figma sandbox backend code once. |
| `npm run build:ui` | Compiles the React UI into `dist/index.html`. |
| `npm run typecheck` | Runs the TypeScript compiler (`tsc --noEmit`) to verify types. |

---

## Step-by-Step Installation in Figma Desktop

1. **Build the plugin bundle**:
   ```bash
   npm run build
   ```
   Ensure that `dist/code.js` and `dist/index.html` have been created.

2. **Open Figma Desktop**:
   Open any Figma document or draft file.

3. **Import Plugin Manifest**:
   - Click the Figma icon menu in the top-left (or press `Ctrl + /` on Windows / `Cmd + /` on macOS).
   - Navigate to **Plugins > Development > Import plugin from manifest...**.
   - Select the `manifest.json` file located in the root of this project.

4. **Launch the Plugin**:
   - Press `Shift + I` to open Figma's Resources menu, switch to the **Plugins** tab, and select **NodePeeker**.
   - Alternatively, right-click on the canvas -> **Plugins > Development > NodePeeker**.

5. **Start Inspecting**:
   - Click any frame, component, button, text, or vector node on the canvas.
   - Inspect the box model, switch color formats, copy CSS or Tailwind code, and export assets instantly.

---

## Project Structure

```
figma-dev-mod/
├── dist/                          # Compiled artifacts loaded by Figma (gitignored)
│   ├── code.js                    # Backend sandbox entry point
│   └── index.html                 # Inlined UI bundle
├── docs/                          # Project documentation
│   ├── installation-guide.md      # Detailed end-user installation & usage
│   ├── brainstorm-summary-...     # Design rationale and feature roadmap
│   └── journals/                  # Per-session engineering log & decisions
├── plans/                         # Execution plans (plan.md + phase-0N-*.md)
├── src/
│   ├── code/                      # Figma sandbox thread (no DOM access)
│   │   ├── code.ts                # Main plugin lifecycle & message router
│   │   ├── color-utils.ts         # HEX, RGB, HSL conversions
│   │   └── extractors.ts          # Box model, fills, typography & border extractor
│   ├── ui/                        # Iframe UI thread (React)
│   │   ├── components/            # UI components
│   │   │   ├── BorderStyle.tsx    # Border style summary + live preview
│   │   │   ├── BoxModel.tsx       # Visual box model diagram
│   │   │   ├── CodeHighlighter.tsx # CSS & Tailwind syntax highlighting
│   │   │   ├── CodeViewer.tsx     # Tailwind & CSS code tab panels
│   │   │   ├── ColorPalette.tsx   # Color swatches with format toggles
│   │   │   ├── EmptyState.tsx     # Placeholder when no node is selected
│   │   │   ├── Header.tsx         # Layer name, type, dimensions & shortcuts
│   │   │   ├── QuickExport.tsx    # SVG & PNG export buttons
│   │   │   └── Toast.tsx          # Copy feedback toasts
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── useClipboard.ts    # Copy helper with toast trigger
│   │   │   └── useFigmaTheme.ts   # Dark/light theme observer
│   │   ├── App.tsx                # Main UI container
│   │   ├── index.html             # Vite HTML entry
│   │   ├── main.tsx               # React DOM root entry
│   │   └── styles.css             # Tailwind base styles
│   ├── types/
│   │   └── messages.ts            # Shared bidirectional messaging contracts
│   └── utils/
│       ├── tailwind-scale.ts      # Spacing, radius & font size mappings
│       └── tailwind-transpiler.ts # CSS-to-Tailwind utility class generator
├── tests/                         # Vitest unit tests
├── AGENTS.md                      # Contributor & AI-assistant guidelines
├── manifest.json                  # Figma plugin configuration
├── package.json                   # Scripts and dependencies
├── postcss.config.js              # PostCSS (Tailwind + autoprefixer)
├── tailwind.config.js             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript compiler options
├── vite.config.ts                 # Vite bundler config with singlefile plugin
└── vitest.config.ts               # Vitest test runner configuration
```

---

## Hot Reloading & Development Tips

- **Reloading UI**: While focused on the open plugin window in Figma, press `Ctrl + R` (Windows) or `Cmd + R` (macOS) to reload immediately without reopening the plugin.
- **Inspecting UI Elements**: In Figma Desktop, right-click inside the plugin window and choose **Inspect** (or press `Ctrl + Shift + I` / `Cmd + Option + I`) to open Chromium DevTools for debugging the plugin iframe.
- **Browser-Only Prototyping**: Run `npm run dev:ui` and open `http://localhost:5173` to test component layout with mocked data in standard browser tabs.

---

## License

MIT License. Free for personal and commercial use.
