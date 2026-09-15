# NodePeeker - Installation & Usage Guide

A lightweight, zero-subscription Figma plugin replacing Dev Mode for free accounts with 1-click Pure CSS & Tailwind inspection with syntax highlighting, color copying (HEX, RGB, HSL), visual box model, keyboard shortcuts, 1-click asset export, and MP4/GIF animation export.

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
6. You will see **"NodePeeker"** added under your Development plugins.

---

## 4. Running the Plugin & Keyboard Shortcuts

### Opening the Plugin

| Method | Shortcut | Description |
|---|---|---|
| **Run Last Plugin (Fastest)** | `Ctrl + Alt + P` (Win) / `Cmd + Option + P` (Mac) | Re-launches NodePeeker from anywhere on the canvas instantly! |
| **Plugins & Widgets Picker** | `Shift + I` | Opens Figma's native Plugins picker; type "NodePeeker" + Enter. |
| **Quick Actions** | `Ctrl + /` (Win) / `Cmd + /` (Mac) | Type "NodePeeker" and press Enter. |
| **Canvas Relaunch Button** | 1-Click in Right Sidebar | Whenever a layer is selected, click **NodePeeker** in the Plugins section. |
| **Context Menu** | Right-click canvas | **Plugins > Development > NodePeeker** |

### Keyboard Shortcuts Inside the Plugin

- **`1` or `C`**: Switch to **Pure CSS** tab (default active tab).
- **`2` or `T`**: Switch to **Tailwind CSS** tab.
- **`3` or `S`**: Switch to **SVG** tab.
- **`Ctrl + C` or `Cmd + C`**: Copy active code block to clipboard (no-ops when the active tab has no content).
- **`Keyboard` icon in header**: View the interactive shortcut cheat sheet anytime.

---

## 5. Core Features

Select any layer on your canvas (frame, button, text, component instance, vector):
- **Inspect Code Viewer (Default: Pure CSS):** Displays formatted code with full syntax highlighting (properties, hex colors with live color chips, values, units, comments, and line numbers). Toggle to **Tailwind CSS** with color-coded utility chips, or to **SVG** for the layer's exported markup with element/attribute highlighting and color swatches. The SVG markup is **fetched on demand**: it is not extracted with the selection, so the first time you open the SVG tab expect a brief pause while the layer is exported, after which the markup is cached for that layer. Switch tabs with **`1`/`C`** (CSS), **`2`/`T`** (Tailwind), or **`3`/`S`** (SVG), and press **`Ctrl + C`** / **`Cmd + C`** to copy the active tab.
- **Box Model:** View outer dimensions (width × height), corner radii, 4-sided padding (top, right, bottom, left), and auto-layout gap. Click any measurement to copy its value.
- **Measure Distance (needs exactly two layers selected):** Select **exactly two layers** — `Shift`-click the second, or marquee over just those two — and the panel switches from the inspector to a distance readout: the **horizontal and vertical gap** between the layers, the **straight-line edge-to-edge distance**, which way the second layer sits relative to the first (for example *"Button is to the right of Card"*), the **overlap extent** when they intersect, and any edges that line up — left, right, top, bottom, or a shared centre line — within half a pixel, so sub-pixel drift does not hide a real alignment. The mini-diagram above the numbers fits both layers into one frame so their relative size and position stay visible, and clicking the measurement chip copies the gap (`24 px`, or `24 × 12 px` when the layers are apart on both axes). **Any other selection** — nothing, one layer, or three or more — keeps the normal inspector, so nothing changes unless you deliberately pick a pair.

  **The measurement is shown in the panel because Figma gives plugins no way to draw a ruler on the canvas.** Figma exposes no API for an ephemeral overlay — no ruler, guide, or measurement label — so a Dev Mode-style ruler cannot be reproduced on the canvas at all. The only way to put a mark there is to create real nodes, which would edit your document and its undo history; NodePeeker is strictly read-only, so the measurement lives in the panel and your file is never modified.

  One caveat on what is being measured: the figures come from each layer's bounding box, which **excludes stroke weight and effect overflow** (shadows, blurs). A gap measured to a thick stroke's visible outer edge therefore reads larger than the distance you see, by that stroke's width.

- **Colors:** View all detected fills and strokes. Toggle between **HEX**, **RGB**, and **HSL** formats. Click any color card to copy the code directly to your clipboard.
- **1-Click Export:** Click **Copy SVG**, **SVG File**, or **PNG @2x** to immediately export clean assets without opening Figma's nested export drawer.
- **Animation Export (MP4 / GIF):** Click **Download MP4** or **Download GIF** to encode the selection as an animation — useful for demos, loading states, and handing motion work to developers. Three things decide whether it works:
  - **It needs a frame placed directly on the page, with Motion animation the encoder can play.** Figma encodes that whole frame — **the entire frame, not the layer you selected** — so the panel tells you which frame it will encode before you click. **The section appears only when the plugin detects animation in that frame** (a Motion timeline, applied animation styles, or keyframes), so a frame with nothing animated shows no export controls at all rather than a button that fails — and neither does a frame nested inside a **Section** or a layer that sits outside any frame, since neither is a page-level frame Figma can encode. Selecting a keyframed layer inside a frame exports the frame it lives in. If an encode does fail anyway, the error names the frame it tried to encode.
  - **Prototype-only Smart Animate flows are not supported by Figma's encoder.** A Smart Animate transition animates the link *between* two frames rather than a timeline inside one, and `exportAsync` has no way to encode it — producing video would mean simulating the prototype player. Such a frame is treated as static: no animation section appears.
  - **The fps choices differ between the formats**, because Figma accepts a different set for each: **MP4** offers 12, 24, 30, and 60 fps (default 30) plus a quality preset, while **GIF** offers 8, 12, 15, 24, and 30 fps (default 15) plus a loop count, where `∞` is the API's `0` and loops forever. Both formats take a standard export scale from 50 % to 400 %.
- **Copyable Layer Link:** A compact link bar sits directly under the header and shows a deep link to the selected layer — the same URL Figma's own **Copy link** produces. Click it to copy the link.

  **A full link requires the plugin to keep `enablePrivatePluginApi: true` in `manifest.json` and to remain private.** Publishing the plugin publicly **permanently disables `figma.fileKey`**, and a public plugin never receives one regardless of the manifest. Before that — or in an unsaved draft — the bar degrades instead of breaking: it shows and copies the node id in **URL form** (`3844-702`) and names the API form (`3844:702`) that Figma's Plugin API expects, so you can still paste a `?node-id=` value or resolve the layer.

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
