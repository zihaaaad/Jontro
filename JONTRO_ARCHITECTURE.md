# Jontro - Professional Utilities Suite
**Created by Zihad Hasan (Z-root-X)**

##  Vision
Jontro is designed to be the ultimate, all-in-one desktop utility suite. It replaces the need for users to download multiple sketchy, ad-filled applications from the internet by providing essential daily tools in one secure, beautiful, and blazing-fast interface. 

The application is heavily inspired by professional developer tools like Postman and VS Code, ensuring a premium User Experience (UX).

##  Architecture
Jontro has transitioned from a Python/PyQt5 script into a modern, enterprise-grade desktop application using web technologies.

*   **Desktop Engine:** Electron.js (Provides native OS access and native installer generation)
*   **Frontend UI:** React.js + TypeScript
*   **Styling:** Tailwind CSS + Lucide React Icons
*   **Build Tool:** Vite (for rapid frontend development)

### Why this architecture?
1. **Zero external runtimes:** Users do not need to install Python, FFmpeg, or Java - FFmpeg ships bundled per-platform (see `THIRD_PARTY_LICENSES.md` for a licensing caveat on that binary). Everything runs natively within the Electron wrapper.
2. **Modular Design:** The sidebar UI acts as a router. Adding a new tool is as simple as dropping a new React Component into the `/tools` directory.
3. **Cross-Platform:** The build config (`package.json` → `build`) and CI (`.github/workflows/`) produce native installers for **Windows (NSIS `.exe`)** and **macOS (`.dmg`, Intel + Apple Silicon)**. Linux is not yet wired up - `os.platform()`-based binary resolution in `electron/main.ts` would support it, but there's no `build.linux` target or CI job for it yet.

##  The Toolset

### 1. Video to Audio Converter
*   **Function:** Extracts audio tracks from video files (`.mp4`, `.mkv`, etc.) in bulk and saves them as high-quality `.mp3`, with optional EBU R128 loudness normalization.
*   **Technology:** Uses `@ffmpeg-installer/ffmpeg` (a real native FFmpeg binary, resolved per-platform/architecture) driven via `fluent-ffmpeg` in the Electron main process - conversion happens as a native subprocess, not `ffmpeg.wasm`.

### 2. Image Resizer & Converter
*   **Function:** Crop (via `react-easy-crop`), resize dimensions, and convert formats (PNG/JPEG/WEBP).
*   **Technology:** HTML5 Canvas for instant, high-quality image manipulation. (No native image library is bundled - `sharp` was removed as an unused dependency.)

### 3. PDF Toolkit
*   **Function:** Merge multiple PDFs, extract specific page ranges (e.g. `1, 3, 5-10`), or rasterize every page of a PDF to PNG images.
*   **Technology:** Uses `pdf-lib` to manipulate PDF buffers directly in memory, and a locally-bundled `pdfjs-dist` worker for rendering pages to canvas (no CDN dependency).

### 4. Screenshot, PDF & OCR Scanner
*   **Function:** Paste a screenshot (Ctrl+V) or upload an image/multi-page PDF to instantly extract text. Optimized for bilingual scanning (English and Bengali).
*   **Technology:** Uses `tesseract.js` (WebAssembly OCR) and `pdfjs-dist` to read text locally without sending data to the cloud - worker script, WASM core, and trained language models are all served from the app bundle (`public/vendor/`, `public/tessdata/`) rather than a CDN. The language models are the one asset fetched once during setup via `npm run fetch:tessdata`, since multi-megabyte binaries can't be committed as source. Features custom image upscaling and contrast stretching.

### 5. To-Do List Manager
*   **Function:** A clean, persistent task tracker for daily workflows with lightweight NLP-based urgency detection.
*   **Technology:** React state persisted to `localStorage`.

### 6. Password Generator
*   **Function:** Creates cryptographically secure, random passwords based on user-defined parameters (length, symbols, numbers).
*   **Technology:** Native JavaScript Crypto API (`window.crypto.getRandomValues`).

### 7. Vector Tracer
*   **Function:** Converts raster images (PNG, JPG) into highly accurate, scalable SVGs using custom tracing presets.
*   **Technology:** Uses `imagetracerjs` to generate algorithmic vectors locally.

### 8. QR Studio
*   **Function:** Generates customizable, high-resolution QR codes that support center logo uploading and background excavation.
*   **Technology:** Uses `qrcode.react` generating native SVGs and PNGs.

##  Future Roadmap
Because of the highly modular React architecture, Jontro can easily expand to include:
*   JSON Formatter / Validator
*   Base64 Encoder/Decoder
*   Color Picker / Hex Converter
*   System Resource Monitor

---
*Documentation auto-generated during the transition from Python to Electron/React.*
