<div align="center">

# ⚡ Jontro — Desktop Utility Suite

**The offline Swiss Army knife for your daily digital workflows.**  
*Zero telemetry. Zero cloud uploads. Total privacy. 100% Free & Open Source.*

[![Release](https://img.shields.io/github/v/release/zihaaaad/Jontro?color=3b82f6&style=flat-square)](https://github.com/zihaaaad/Jontro/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Electron](https://img.shields.io/badge/Electron-43-47848F?style=flat-square&logo=electron&logoColor=white)](https://electronjs.org)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Privacy First](https://img.shields.io/badge/Privacy-0--Telemetry-purple?style=flat-square)](https://github.com/zihaaaad/Jontro)

[**Download Windows & macOS Installers**](https://github.com/zihaaaad/Jontro/releases/latest) &bull; [**Visit Landing Page**](https://zihaaaad.github.io/Jontro/)

</div>

---

### Why Jontro?

Most free web converters and PDF utilities force you to upload private contracts, invoices, screenshots, and videos to mysterious cloud servers where your data is logged and monetized.

**Jontro fixes this permanently.** It runs directly on your machine's hardware using native background processes and client-side WebAssembly. All parsing, rendering, and neural computations take place in local RAM with **zero network requests**.

---

## 🛠️ Included Tools

| Tool | Core Engine | What It Does |
| :--- | :--- | :--- |
| **🎬 Video to Audio** | Native `FFmpeg` | Bulk extract pristine MP3s from MP4, MKV, AVI, MOV with serial execution queues & optional loudness normalization. |
| **🔍 OCR & PDF Scanner** | `Tesseract.js` (WASM) | Hit <kbd>Ctrl+V</kbd> to paste a screenshot and pull text immediately. Supports bilingual recognition (English & Bengali). |
| **📑 PDF Studio** | `pdf-lib` + `pdfjs-dist` | Merge multiple PDFs, isolate page ranges (e.g. `1, 3, 5-10`), or rasterize pages to crisp PNGs. |
| **🖼️ Image Studio** | HTML5 Canvas / WebGL | Crop, resize, pan, zoom, and export to WebP, JPEG, or PNG with lossless aspect ratio locking. |
| **✏️ Vector Tracer** | `imagetracerjs` | Convert pixelated PNGs/JPGs into scalable, layered SVG vector paths locally. |
| **📱 QR Studio** | `qrcode.react` | Create high-resolution QR codes with center logos, custom colors, and background excavation. |
| **🔐 Password Generator** | Web Crypto API | Generate high-entropy passwords with OS hardware randomness and `zxcvbn` strength scoring. |
| **📋 Smart Task Manager** | NLP Urgency Sorting | Fast, persistent to-do companion that automatically ranks urgency straight from natural language. |

---

## 🚀 Quick Start (Developers)

```bash
# 1. Clone the repository
git clone https://github.com/zihaaaad/Jontro.git
cd Jontro

# 2. Install dependencies
npm install

# 3. Download offline OCR language models (one-time setup)
npm run fetch:tessdata

# 4. Launch the development application
npm run dev
```

---

## 📦 Building Production Installers

Jontro compiles into native installers for **Windows (NSIS `.exe`)** and **macOS (`.dmg`, Universal binary for Intel & Apple Silicon)**:

```bash
npm run build
```
Compiled binaries are output directly into the `release/` directory.

---

## 🛡️ Privacy & Security Manifesto

- **0 Telemetry:** No analytics scripts, no crash loggers (no Sentry, no Mixpanel, no Google Analytics).
- **0 Cloud Calls:** Conversions and neural models run on your CPU & RAM.
- **Hardware Entropy:** Passwords use `window.crypto.getRandomValues()` directly from OS randomness pools.
- **Open Source:** Full codebase is audited and transparent under the MIT license.

---

## ☕ Support Independent Open Source

Jontro is 100% free and open-source without ads or subscriptions. If it saves you time, donations are deeply appreciated:

- **bKash (Send Money):** `01732-109847`
- **Nagad (Send Money):** `01732-109847`
- **Bank Transfer (Islami Bank Bangladesh PLC):** Branch: Bogura &middot; Account: `20501120207611108` &middot; Name: Zihad Hasan

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.

