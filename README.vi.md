# NodePeeker

> Plugin Figma tốc độ cao, hoàn toàn miễn phí, thay thế Dev Mode trả phí của Figma. Hỗ trợ xem mã Tailwind CSS, CSS chuẩn, mô hình Box Model trực quan, sao chép mã màu 1-click, xuất tài nguyên nhanh, xuất hoạt ảnh MP4/GIF, và tích hợp sẵn **Local MCP Server** kết nối trực tiếp với **Cursor**, **Antigravity IDE** và **pi.dev**.

[English](README.md) | **Tiếng Việt**

[![Figma Plugin API](https://img.shields.io/badge/Figma_Plugin_API-v1.0.0-1abc9c.svg)](https://www.figma.com/plugin-docs/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-7.0-646cff.svg)](https://vitejs.dev/)
[![MCP Server](https://img.shields.io/badge/MCP-Streamable_HTTP-blueviolet.svg)](#-local-mcp-bridge-cursor-antigravity-ide-pidev)

---

## Mục lục

- [Tính năng nổi bật](#-tính-năng-nổi-bật)
- [Kiến trúc & Công nghệ](#-kiến-trúc--công-nghệ)
- [Cài đặt nhanh & Các lệnh Build](#-cài-đặt-nhanh--các-lệnh-build)
- [Hướng dẫn cài đặt trong Figma Desktop](#-hướng-dẫn-cài-đặt-trong-figma-desktop)
- [Local MCP Bridge (Cursor, Antigravity IDE, pi.dev)](#-local-mcp-bridge-cursor-antigravity-ide-pidev)
  - [Tại sao nên dùng NodePeeker MCP?](#tại-sao-nên-dùng-nodepeeker-mcp)
  - [Bước 1: Khởi động MCP Broker](#bước-1-khởi-động-mcp-broker)
  - [Bước 2: Kết nối Plugin Figma với Broker](#bước-2-kết-nối-plugin-figma-với-broker)
  - [Bước 3: Cấu hình cho Trợ lý AI của bạn](#bước-3-cấu-hình-cho-trợ-lý-ai-của-bạn)
    - [Cấu hình Cursor](#1-cursor)
    - [Cấu hình Antigravity IDE](#2-antigravity-ide)
    - [Cấu hình pi.dev](#3-pidev)
  - [Danh sách các công cụ MCP](#danh-sách-các-công-cụ-mcp)
- [Xử lý sự cố MCP thường gặp](#-xử-lý-sự-cố-mcp-thường-gặp)
- [Cấu trúc thư mục dự án](#-cấu-trúc-thư-mục-dự-án)
- [Giấy phép (License)](#-giấy-phép-license)

---

## 🚀 Tính năng nổi bật

### 💻 Trình soi mã nguồn (Mặc định: Pure CSS)
- **Ưu tiên CSS chuẩn:** Tự động hiển thị các khai báo CSS rõ ràng, chuẩn mực theo mặc định kèm theo ô hiển thị màu trực tiếp, số dòng và định dạng sẵn sàng để copy-paste vào dự án.
- **Tô màu cú pháp (Syntax Highlighting):** Phân loại và tô màu theo thời gian thực cho thuộc tính (properties), giá trị (values), đơn vị (units), mã màu hex và các nhóm tiện ích Tailwind.
- **Tạo mã Tailwind CSS:** Chuyển đổi linh hoạt sang các class Tailwind với các huy hiệu màu sắc trực quan. Xuất giá trị **thực tế** của layer thay vì làm tròn thô thiển: đổ bóng tùy chỉnh (`shadow-[0px_4px_8px_2px_rgba(0,0,0,0.25)]`), chiều cao dòng và khoảng cách chữ (`leading-*` / `tracking-*`), kích thước Hug của Auto-layout (`w-fit` / `h-fit`), kéo dãn (`self-stretch`), và định vị tuyệt đối (`absolute` + `left-[…]` / `top-[…]`).
- **Mã SVG & Xem trước trực quan:** Chuyển sang tab SVG để xem mã vector thô hoặc xem trước đồ họa trên bảng nền caro (checkerboard) trước khi sao chép hoặc tải về máy.
- **Phím tắt trong Plugin:** Nhấn phím `1` hoặc `C` cho CSS, `2` hoặc `T` cho Tailwind, `3` hoặc `S` cho SVG, và `Ctrl+C` / `Cmd+C` để sao chép nhanh khối mã đang chọn.

### 🎨 Sao chép màu siêu nhanh
- **Tự động nhận diện bảng màu:** Trích xuất toàn bộ màu nền (fills) và viền (strokes) được áp dụng trên layer đang chọn và các layer con trực tiếp.
- **Chuyển đổi đa định dạng:** Chuyển đổi tức thì giữa các không gian màu **HEX**, **HEXA 8 ký tự (kèm kênh alpha)**, **RGB**, và **HSL**.
- **Copy 1-Click:** Nhấp chuột vào bất kỳ huy hiệu màu hoặc ô màu nào để sao chép ngay giá trị đã định dạng vào clipboard.

### 📦 Mô hình Box Model trực quan
- **Sơ đồ tương tác:** Thể hiện kích thước tổng thể ($W \times H$), khoảng đệm 4 chiều (Top, Right, Bottom, Left), khoảng cách Auto-layout (gap) và bán kính bo góc (corner radius).
- **Click để copy:** Nhấp vào bất kỳ thông số kích thước hoặc padding nào để sao chép chính xác số pixel.

### 📏 Đo khoảng cách giữa 2 Layer
- **Chọn đúng 2 layer:** Bảng kiểm tra sẽ tự động chuyển sang chế độ đo khoảng cách — hiển thị **khoảng cách ngang, khoảng cách dọc, khoảng cách đường chéo mép-đến-mép**, và hướng tương đối giữa 2 phần tử (`Button is to the right of Card`).
- **Căn hàng & Giao nhau:** Nhận diện các mép thẳng hàng (trên, dưới, trái, phải, đường tâm) với độ chính xác nửa pixel và hiển thị diện tích đè nhau nếu 2 layer giao nhau.

### ⚡ Xuất tài nguyên 1-Click
- **Copy SVG:** Sao chép trực tiếp mã SVG đã được tối ưu vào clipboard để dán thẳng vào JSX/HTML.
- **Lưu SVG:** Tải xuống file vector SVG chỉ với 1 cú click chuột mà không cần mở menu xuất lồng ghép phức tạp của Figma.
- **Lưu PNG @2x:** Xuất hình ảnh raster độ phân giải cao sắc nét.

### 🎬 Xuất hoạt ảnh & Video (MP4 / GIF)
- **Hỗ trợ xuất Frame & Layer:** Xuất hoạt ảnh keyframe, video fill và Motion timelines thành file MP4 hoặc ảnh động GIF.
- **Tùy chỉnh linh hoạt:** Chọn 12/24/30/60 fps cho MP4 kèm chất lượng (Low, Medium, High) hoặc 8/12/15/24/30 fps cho GIF kèm kiểm soát số vòng lặp (`∞` lặp vô tận hoặc số lần cố định).

### 🤖 Tích hợp sẵn MCP Server (Cursor & Antigravity IDE)
- Tích hợp sẵn dịch vụ Bridge Service giúp truyền dữ liệu thiết kế trực tiếp sang các trợ lý lập trình AI qua chuẩn mở **Model Context Protocol (MCP)** mà không tốn quota tài khoản Figma.

### 🌓 Tích hợp giao diện Native Figma
- Tự động đồng bộ với giao diện Sáng/Tối của Figma bằng hệ màu Catppuccin (Latte cho giao diện sáng, Mocha cho giao diện tối).

---

## 🏗️ Kiến trúc & Công nghệ

```
   ┌────────────────────────────────────────────────────────┐
   │                   Figma Canvas                         │
   └───────────────────────────┬────────────────────────────┘
                               │ figma.on("selectionchange")
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │  Figma Sandbox (src/code/code.ts)                      │
   │  - Đọc scene-graph & trích xuất dữ liệu (extractors)   │
   │  - Tính toán & chuyển đổi màu sắc (color-utils.ts)     │
   │  - Bridge Service: HTTP polling & đẩy data sang broker │
   └───────────────┬────────────────────────┬───────────────┘
                   │ postMessage            │ HTTP :3939
                   ▼                        ▼
┌──────────────────────────────┐ ┌──────────────────────────────────┐
│  React UI (src/ui/App.tsx)   │ │  MCP Broker (bridge/broker.ts)   │
│  - Tailwind + Lucide Icons   │ │  - Transport Streamable HTTP     │
│  - Box Model & Code Viewer   │ │  - Lưu snapshot thiết kế         │
│  - Modal cài đặt Bridge      │ │  - Không tốn quota seat Figma    │
│  - Đóng gói single dist/index│ └──────────────────┬───────────────┘
└──────────────────────────────┘                    │
                                     Giao thức MCP  ▼
                                  ┌───────────────────────────────┐
                                  │ Cursor / Antigravity / pi.dev │
                                  └───────────────────────────────┘
```

- **Figma Plugin API**: Tương tác với scene graph thông qua các API an toàn, không làm biến đổi lịch sử Undo của file thiết kế.
- **React 18 + TypeScript**: Giao diện đóng gói thành một file HTML duy nhất chạy trong iframe độc lập.
- **Tailwind CSS (Catppuccin)**: Token giao diện ngữ nghĩa phản hồi linh hoạt theo chế độ sáng/tối của Figma.
- **Streamable HTTP MCP**: Chuẩn transport MCP hiện đại chạy trên cổng cục bộ `http://127.0.0.1:3939/mcp`.

---

## ⚡ Cài đặt nhanh & Các lệnh Build

### Yêu cầu môi trường
- Node.js ≥ 18.0.0
- npm ≥ 9.0.0
- Ứng dụng Figma Desktop

### 1. Clone mã nguồn & Cài đặt thư viện
```bash
git clone https://github.com/hongducdev/nodepeeker.git
cd nodepeeker
npm install
```

### 2. Danh sách các lệnh chạy

| Lệnh | Mô tả |
|---|---|
| `npm run build` | **Build toàn diện:** Biên dịch cả sandbox (`dist/code.js`) và UI (`dist/index.html`). |
| `npm run build:code` | Biên dịch mã TypeScript của sandbox bằng esbuild vào `dist/code.js`. |
| `npm run build:ui` | Đóng gói React UI thành 1 file duy nhất `dist/index.html`. |
| `npm run bridge` | **Tự động build và chạy local MCP broker** tại `127.0.0.1:3939`. |
| `npm run bridge:build` | Biên dịch `bridge/broker.ts` thành `bridge/dist/broker.mjs`. |
| `npm run update` | **Cập nhật 1-click:** Kéo code mới từ GitHub, cập nhật thư viện và build lại toàn bộ plugin + broker. |
| `npm test` | Chạy toàn bộ 23 file kiểm thử Vitest (227 test cases). |
| `npm run typecheck` | Kiểm tra lỗi kiểu TypeScript (`tsc --noEmit`). |
| `npm run watch:code` | Tự động biên dịch lại sandbox khi sửa file. |
| `npm run dev:ui` | Mở Vite dev server để phát triển UI trên trình duyệt tại `http://localhost:5173`. |

---

## 🔌 Hướng dẫn cài đặt trong Figma Desktop

1. **Biên dịch plugin**:
   ```bash
   npm run build
   ```
   Đảm bảo thư mục `dist/code.js` và `dist/index.html` đã được tạo thành công.

2. **Mở Figma Desktop**:
   Mở một file thiết kế bất kỳ.

3. **Import Plugin từ Manifest**:
   - Bấm vào menu Figma góc trên bên trái (hoặc nhấn `Ctrl + /` trên Windows / `Cmd + /` trên Mac).
   - Chọn **Plugins > Development > Import plugin from manifest...**.
   - Trỏ đến file `manifest.json` ở thư mục gốc của dự án này.

4. **Khởi chạy NodePeeker**:
   - Chuột phải trên canvas -> **Plugins > Development > NodePeeker** (hoặc nhấn phím tắt `Ctrl + Alt + P` / `Cmd + Option + P`).

---

## 🤖 Local MCP Bridge (Cursor, Antigravity IDE, pi.dev)

### Tại sao nên dùng NodePeeker MCP?

Máy chủ MCP chính thức của Figma bị giới hạn theo **seat** (gói Starter chỉ có 20 lượt gọi công cụ mỗi tháng). NodePeeker xóa bỏ hoàn toàn rào cản này bằng cách điều hướng dữ liệu thông qua Plugin API cục bộ:
- **Không giới hạn lượt gọi:** Không tốn phí thuê bao, không giới hạn số lần gọi công cụ.
- **Đồng bộ hóa thời gian thực:** Mỗi khi bạn chọn một layer trong Figma, dữ liệu được tự động đẩy ngay sang broker cục bộ.
- **Tiết kiệm token AI với các chế độ xem:** Trả về dạng rút gọn `summary` (~60 tokens), `tailwind` (~120 tokens), `css` (~400 tokens), hoặc toàn bộ dữ liệu `full`.

---

### Bước 1: Khởi động MCP Broker

Mở một cửa sổ terminal và chạy lệnh:
```bash
npm run bridge
```

Broker sẽ tự động build và in thông tin kết nối cùng token xác thực:
```text
  NodePeeker Bridge broker
  MCP   http://127.0.0.1:3939/mcp
  token 0R4_GbTaT7oH5Y7B4E-Sjn0dv4n-CDKT

  Cursor / pi.dev config:
    { "url": "http://127.0.0.1:3939/mcp",
      "headers": { "X-Bridge-Token": "0R4_GbTaT7oH5Y7B4E-Sjn0dv4n-CDKT" } }
```

> **Lưu ý:** Token được tạo ngẫu nhiên ở lần chạy đầu tiên và lưu cục bộ tại `bridge/.token` (được đưa vào `.gitignore`). Hãy giữ cửa sổ terminal này chạy trong lúc bạn lập trình cùng AI.

---

### Bước 2: Kết nối Plugin Figma với Broker

1. Mở plugin **NodePeeker** trong Figma.
2. Bấm vào icon **MCP (Bot)** ở thanh tiêu đề (hoặc nút **SETTINGS** ở màn hình ban đầu).
3. Dán mã token mà terminal đã in ra ở Bước 1 vào rồi bấm **Save & Connect**.
4. Chấm trạng thái sẽ chuyển sang màu **Xanh lá (Connected)**.
5. ⚠️ **Quan trọng:** Hãy **giữ cửa sổ plugin NodePeeker mở** trên màn hình Figma khi làm việc với AI (có thể thu nhỏ hoặc kéo sang góc).

---

### Bước 3: Cấu hình cho Trợ lý AI của bạn

#### 1. Cursor

Cursor hỗ trợ giao thức Streamable HTTP MCP qua file cấu hình hoặc giao diện cài đặt:

**Cách 1: Cấu hình Toàn cục (Khuyên dùng)**
Thêm vào file `~/.cursor/mcp.json` (`C:\Users\<Tên_User>\.cursor\mcp.json` trên Windows):

```json
{
  "mcpServers": {
    "nodepeeker": {
      "url": "http://127.0.0.1:3939/mcp",
      "headers": {
        "X-Bridge-Token": "<TOKEN_CỦA_BẠN>"
      }
    }
  }
}
```

**Cách 2: Cấu hình cho riêng từng dự án**
Tạo file `.cursor/mcp.json` tại thư mục gốc của project bạn mở trong Cursor.

**Kiểm tra trên Cursor:**
Mở **Cursor Settings** (`Ctrl + ,`) -> **Features** -> **MCP Servers**. Bạn sẽ thấy mục `nodepeeker` sáng đèn **Xanh lá (Active)**.

---

#### 2. Antigravity IDE

Antigravity IDE hỗ trợ giao thức Streamable HTTP MCP thông qua file cấu hình global của nó.

**Đường dẫn file cấu hình:**
Mở hoặc tạo file `~/.gemini/config/mcp_config.json` (`C:\Users\<Tên_User>\.gemini\config\mcp_config.json` trên Windows):

```json
{
  "mcpServers": {
    "nodepeeker": {
      "serverUrl": "http://127.0.0.1:3939/mcp",
      "headers": {
        "X-Bridge-Token": "<TOKEN_CỦA_BẠN>"
      }
    }
  }
}
```

> **Lưu ý:** Antigravity IDE dùng khóa `"serverUrl"` (thay vì `"url"` như Cursor).

**Kiểm tra trên Antigravity IDE:**
1. Khởi động lại Antigravity IDE (để Language Server tải lại file cấu hình MCP).
2. Vào **Additional Options (...) > MCP Servers** trong khung chat.
3. Bạn sẽ thấy `nodepeeker` hiển thị sẵn sàng cùng danh sách 3 công cụ.

---

#### 3. pi.dev

Thêm vào file `~/.config/mcp/mcp.json`:

```json
{
  "mcpServers": {
    "nodepeeker": {
      "url": "http://127.0.0.1:3939/mcp",
      "headers": {
        "X-Bridge-Token": "<TOKEN_CỦA_BẠN>"
      }
    }
  }
}
```

---

### Danh sách các công cụ MCP

Sau khi kết nối thành công, trợ lý AI sẽ tự động sở hữu các công cụ sau:

| Tên công cụ | Tham số | Mô tả chức năng |
|---|---|---|
| `nodepeeker_status` | _không có_ | Kiểm tra plugin NodePeeker có đang mở không, trả về tên file và file key của bản vẽ Figma hiện tại. |
| `nodepeeker_get_selection` | `view?: "summary" \| "tailwind" \| "css" \| "full"` | Lấy dữ liệu chi tiết của layer bạn đang chọn trên màn hình Figma. |
| `nodepeeker_get_node` | `nodeId: string`, `view?: "summary" \| "tailwind" \| "css" \| "full"` | Truy xuất chi tiết bất kỳ component/layer nào theo ID (ví dụ `"1:2"` hoặc `"349:399"`), kèm cây phân cấp phần tử con. |

#### Câu lệnh mẫu trong khung Chat AI:
- *"Kiểm tra xem Figma đã kết nối chưa và đang mở file nào."*
- *"Xem layer tôi đang chọn trên Figma và viết component React Tailwind tương ứng."*
- *"Đọc thông tin node 349:399 trong Figma và xuất bảng màu cùng kiểu chữ."*

---

## 🛠️ Xử lý sự cố MCP thường gặp

| Hiện tượng | Nguyên nhân | Cách khắc phục |
|---|---|---|
| Lỗi `PLUGIN_DISCONNECTED` trên Cursor / Antigravity | Cửa sổ plugin trong Figma đã bị đóng hoặc thu nhỏ. | **Figma sẽ ngắt toàn bộ tiến trình plugin khi cửa sổ bị tắt.** Mở lại NodePeeker trong Figma (`Ctrl+Alt+P`) và giữ cửa sổ luôn hiển thị trên canvas. |
| Báo `NEEDS TOKEN` trong Figma | Chưa dán token vào plugin. | Copy token từ terminal chạy lệnh `npm run bridge`, bấm vào icon MCP trên NodePeeker, dán vào và bấm **Save & Connect**. |
| Lỗi `401 Unauthorized` | Header `X-Bridge-Token` không khớp hoặc bị thiếu trong file cấu hình. | Kiểm tra lại xem token trong `mcp.json` / `mcp_config.json` có đúng với token trong `bridge/.token` hay không. |
| Rớt kết nối khi chuyển qua lại giữa các cửa sổ | Trình duyệt Electron của Figma giảm tần suất chạy timer khi ở chế độ nền. | NodePeeker đã được nâng thời gian chờ lên 30 giây. Nếu bị giật lag, bạn chỉ cần click chuột phải vào plugin và bấm **Reload plugin** (`Ctrl + R`). |
| Antigravity IDE không hiển thị công cụ | Chưa khởi động lại phần mềm sau khi sửa file cấu hình. | Tắt và mở lại Antigravity IDE để server nhận diện file `mcp_config.json`. |

---

## 📁 Cấu trúc thư mục dự án

```
figma-dev-mod/
├── src/
│   ├── code/                      # Luồng Sandbox Figma (không có DOM)
│   │   ├── bridge-service.ts      # Dịch vụ Bridge tích hợp (polling & push dữ liệu)
│   │   ├── code.ts                # Entry point sandbox và điều phối message
│   │   ├── color-utils.ts         # Tính toán và chuyển đổi mã màu
│   │   ├── extractors.ts          # Bộ trích xuất Box model, fills, typography & border
│   │   └── video-frame.ts         # Nhận diện hoạt ảnh và video frame
│   ├── types/
│   │   └── messages.ts            # Hợp đồng giao tiếp giữa Sandbox và UI
│   ├── ui/                        # Luồng UI React (chạy trong Iframe)
│   │   ├── components/            # Các component giao diện (+ BridgeSettingsModal.tsx)
│   │   ├── hooks/                 # Custom React hooks (chủ đề, clipboard)
│   │   ├── App.tsx                # Component gốc của giao diện
│   │   ├── index.html             # Entry HTML của Vite
│   │   └── styles.css             # Tailwind CSS & biến màu Catppuccin
│   └── utils/
│       ├── distance.ts            # Thuật toán hình học đo khoảng cách
│       ├── node-link.ts           # Tạo liên kết sâu (deep link) tới layer
│       ├── tailwind-scale.ts      # Bảng ánh xạ khoảng cách, bán kính bo góc, cỡ chữ
│       ├── tailwind-transpiler.ts # Bộ biên dịch CSS sang Tailwind classes
│       └── video-options.ts       # Tùy chọn FPS và chất lượng video
├── bridge/                        # MCP Broker (Server Node.js cho AI assistants)
│   ├── broker.ts                  # Server Streamable HTTP MCP (:3939)
│   ├── protocol.ts                # Định nghĩa giao thức và kiểu dữ liệu
│   ├── state.ts                   # Bộ nhớ cache snapshot & hàng đợi lệnh
│   ├── project.ts                 # Chiếu dữ liệu theo view (summary, tailwind, css, full)
│   └── fake-plugin.mjs            # Bộ giả lập plugin phục vụ kiểm thử
├── tests/                         # 22 file kiểm thử Vitest (222 tests - 100% pass)
├── dist/                          # Sản phẩm build hoàn chỉnh nạp vào Figma
├── manifest.json                  # Manifest định danh plugin Figma
├── package.json                   # Quản lý script và dependencies
├── tailwind.config.js             # Cấu hình Tailwind CSS
├── tsconfig.json                  # Cấu hình TypeScript
└── vite.config.ts                 # Cấu hình Vite single-file bundler
```

---

## 📄 Giấy phép (License)

Bản quyền thuộc giấy phép MIT. Hoàn toàn miễn phí cho cả mục đích cá nhân lẫn thương mại.
