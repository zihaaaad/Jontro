# Jontro

**Jontro** is a highly optimized, fully offline, privacy-first desktop utility application built with Electron, React, and Tailwind CSS. It is designed to perform heavy computational tasks locally on your machine, guaranteeing that your sensitive data is never uploaded to the cloud.

##  Core Modules

- **Video to Audio Converter:** Extract high-quality MP3 audio from bulk video files natively using an embedded FFmpeg engine. Protects the OS scheduler via a serial execution queue.
- **Image Resizer & Cropper:** A native WebGL cropping studio that allows you to lock aspect ratios, pan, zoom, and export to WEBP/JPEG/PNG without quality loss.
- **PDF Toolkit:** Merge multiple PDFs sequentially or extract highly specific page ranges (e.g., `1, 3, 5-10`) using a complex string parser and `pdf-lib`.
- **OCR & PDF Scanner:** Extract text instantly from screenshots or multi-page PDFs using an offline WebAssembly Tesseract.js neural network, natively optimized for English and Bengali.
- **Vector Tracer:** Convert raster images (PNG/JPG) into infinitely scalable SVGs using an ultra-perfect tracing algorithm.
- **QR Studio:** Generate high-quality QR codes with custom styling, embedded logos, and background excavation.
- **Password Generator:** Generate cryptographically secure passwords using hardware-entropy via `window.crypto.getRandomValues()`.
- **Task Manager:** A built-in, lightweight todo list that perfectly synchronizes with your local storage.

##  Technology Stack

- **Frontend Framework:** React 19 + Vite
- **Desktop Runtime:** Electron
- **Styling:** Tailwind CSS v4 (Monochromatic Professional Theme)
- **Core Engines:** `ffmpeg`, `react-easy-crop`, `pdf-lib`, `pdfjs-dist`, `tesseract.js`, `imagetracerjs`, `qrcode.react`

##  Installation & Development

To run this project locally, ensure you have Node.js installed.

```bash
# Clone the repository
git clone https://github.com/zihaaaad/Jontro.git

# Navigate to the project directory
cd Jontro

# Install dependencies
npm install

# Start the development server
npm run dev
```

##  Building for Production

To compile Jontro into a standalone `.exe` installer for Windows:

```bash
npm run build
```
The compiled installer will be located in the `release/` directory.

##  Security & Privacy
Jontro operates strictly on a 0-telemetry, 0-cloud architecture. All parsing, rendering, extracting, and neural network computing happens directly on your CPU and RAM. The application is isolated from external API calls to ensure absolute data privacy.

##  License
This project is open-source and licensed under the MIT License.
