# Figma Dev Inspector Plugin - Installation & Usage Guide

A lightweight, zero-subscription Figma plugin replacing Dev Mode for free accounts with 1-click Pure CSS & Tailwind inspection with syntax highlighting, color copying (HEX, RGB, HSL), visual box model, keyboard shortcuts, and 1-click asset export.

---

## 1. Prerequisites

- **Node.js**: v18.0.0 or higher recommended.
- **npm**: v9.0.0 or higher.
- **Figma Desktop App**: Required for loading local development plugins (Figma in the web browser requires the Figma Desktop Agent for local plugins).

---

## 2. Quick Build

Before importing into Figma, install dependencies and build the production bundle:

```bash
# Install dependencies
npm install

# Compile code backend and single-file UI bundle
npm run build
```

This compiles:
- `dist/code.js` — Figma sandbox backend (bundled via esbuild)
- `dist/index.html` — Self-contained React 18 + Tailwind CSS UI with syntax highlighting (bundled via Vite singlefile)

---

## 3. Installing in Figma Desktop

1. Open the **Figma Desktop** application.
2. Open any Figma design file or draft.
3. Click the top-left **Figma Main Menu** (or press `Ctrl + /` on Windows / `Cmd + /` on macOS).
4. Navigate to **Plugins > Development > Import plugin from manifest...**.
5. In the file picker, browse to the root directory of this repository and select `manifest.json`.
6. You will see **"Dev Inspector (CSS & Tailwind)"** added under your Development plugins.

---

## 4. Running the Plugin & Keyboard Shortcuts

### Opening the Plugin

| Method | Shortcut | Description |
|---|---|---|
| **Run Last Plugin (Fastest)** | `Ctrl + Alt + P` (Win) / `Cmd + Option + P` (Mac) | Re-launches Dev Inspector from anywhere on the canvas instantly! |
| **Plugins & Widgets Picker** | `Shift + I` | Opens Figma's native Plugins picker; type "Dev Inspector" + Enter. |
| **Quick Actions** | `Ctrl + /` (Win) / `Cmd + /` (Mac) | Type "Dev Inspector" and press Enter. |
| **Canvas Relaunch Button** | 1-Click in Right Sidebar | Whenever a layer is selected, click **Inspect CSS & Tailwind** in the Plugins section. |
| **Context Menu** | Right-click canvas | **Plugins > Development > Dev Inspector (CSS & Tailwind)** |

### Keyboard Shortcuts Inside the Plugin

- **`1` or `C`**: Switch to **Pure CSS** tab (default active tab).
- **`2` or `T`**: Switch to **Tailwind CSS** tab.
- **`Ctrl + C` or `Cmd + C`**: Copy active code block to clipboard.
- **`Keyboard` icon in header**: View the interactive shortcut cheat sheet anytime.

---

## 5. Core Features

Select any layer on your canvas (frame, button, text, component instance, vector):
- **Inspect Code Viewer (Default: Pure CSS):** Displays formatted code with full syntax highlighting (properties, hex colors with live color chips, values, units, comments, and line numbers). Toggle to **Tailwind CSS** with color-coded utility chips.
- **Box Model:** View outer dimensions (width × height), corner radii, 4-sided padding (top, right, bottom, left), and auto-layout gap. Click any measurement to copy its value.
- **Colors:** View all detected fills and strokes. Toggle between **HEX**, **RGB**, and **HSL** formats. Click any color card to copy the code directly to your clipboard.
- **1-Click Export:** Click **Copy SVG**, **SVG File**, or **PNG @2x** to immediately export clean assets without opening Figma's nested export drawer.

---

## 6. Development & Live Reload

To iterate on the plugin source code:

```bash
# Terminal 1: Watch sandbox backend code
npm run watch:code

# Terminal 2: Run UI development server (for browser mockup)
npm run dev:ui

# Terminal 3: Rebuild production UI bundle on change
npm run build:ui
```

### Hot Reloading in Figma
While the plugin window is focused in Figma:
- Press `Ctrl + R` (Windows) or `Cmd + R` (macOS) to reload the plugin iframe and test UI changes instantly.
- Right-click inside the plugin window and choose **Reload plugin**.

---

## 7. Security & Offline Guarantee

The plugin is designed for complete privacy:
- **`networkAccess.allowedDomains: ["none"]`**: Enforced strictly in `manifest.json`.
- **Zero Telemetry / No Tracking**: No external analytics, CDNs, or remote API calls.
- **100% Local Execution**: All computations and code generation happen on your local machine.
