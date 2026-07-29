# Jontro - Professional Utilities Suite
**Created by Zihad Hasan (Z-root-X)**

##  Vision
Jontro is designed to be the ultimate, all-in-one desktop utility suite. It replaces the need for users to download multiple sketchy, ad-filled applications from the internet by providing essential daily tools in one secure, beautiful, and blazing-fast interface. 

The application is heavily inspired by professional developer tools like Postman and VS Code, ensuring a premium User Experience (UX).

##  Architecture
Jontro has transitioned from a Python/PyQt5 script into a modern, enterprise-grade desktop application using web technologies.

*   **Desktop Engine:** Electron.js (Provides native OS access and standalone `.exe` generation)
*   **Frontend UI:** React.js + TypeScript
*   **Styling:** Tailwind CSS + Lucide React Icons
*   **Build Tool:** Vite (for rapid frontend development)

### Why this architecture?
1. **100% Standalone:** Users do not need to install Python, FFmpeg, or Java. Everything runs natively within the Electron wrapper.
2. **Modular Design:** The sidebar UI acts as a router. Adding a new tool is as simple as dropping a new React Component into the `/tools` directory.
3. **Cross-Platform:** The codebase can compile natively for Windows (.exe), Mac (.dmg), and Linux (.AppImage).

##  The Toolset

### 1. Video to Audio Converter
*   **Function:** Extracts audio tracks from video files (`.mp4`, `.mkv`, etc.) and saves them as high-quality `.mp3`.
*   **Technology:** Uses `ffmpeg-static` or `ffmpeg.wasm` to perform conversion directly on the user's machine without external dependencies.

### 2. Image Resizer & Converter
*   **Function:** Batch resize dimensions and convert formats (e.g., PNG to JPG, WebP).
*   **Technology:** Uses `sharp` (Node.js) or HTML5 Canvas for instant, high-quality image manipulation.

### 3. PDF Merger & Splitter
*   **Function:** Combine multiple PDF documents into one, or extract specific pages from a large PDF.
*   **Technology:** Uses `pdf-lib` to manipulate PDF buffers directly in memory.

### 4. Screenshot & OCR (Optical Character Recognition)
*   **Function:** Allows users to select an area of their screen and instantly extract any text present in the image.
*   **Technology:** Uses `tesseract.js` (WebAssembly OCR) to read text locally without sending data to the cloud.

### 5. To-Do List Manager
*   **Function:** A clean, persistent task tracker for daily workflows.
*   **Technology:** React State combined with `localStorage` or Electron's `electron-store` for data persistence.

### 6. Password Generator
*   **Function:** Creates cryptographically secure, random passwords based on user-defined parameters (length, symbols, numbers).
*   **Technology:** Native JavaScript Crypto API (`window.crypto.getRandomValues`).

##  Future Roadmap
Because of the highly modular React architecture, Jontro can easily expand to include:
*   JSON Formatter / Validator
*   Base64 Encoder/Decoder
*   Color Picker / Hex Converter
*   System Resource Monitor

---
*Documentation auto-generated during the transition from Python to Electron/React.*
