# Third-Party Licensing Analysis

Jontro's own code is MIT-licensed (see `LICENSE`). This document tracks the
licenses of bundled third-party dependencies, called out because Jontro
ships **compiled binaries and models**, not just JavaScript - and one of
them needed action.

## FFmpeg binary is GPLv3, not LGPL - compliance notice added, staleness still open

**Update:** the compliance gap described below is now fixed - `licenses/FFMPEG-NOTICE.md`
and the full GPLv3 text (`licenses/GPLv3-FULL-TEXT.txt`) ship with every
installer via `extraResources` in `package.json`, landing in the app's
`resources/licenses/` folder. The **security/staleness** issue (a 2018
build with unpatched CVEs) is still open - see below for why it wasn't
swapped automatically.

`package.json` depends on `@ffmpeg-installer/ffmpeg` (the npm *wrapper*,
which is `LGPL-2.1`), and `electron-builder`'s `asarUnpack` config ships the
actual compiled `ffmpeg` executable inside every installer.

That executable is **not** LGPL. Its own `package.json` declares it
explicitly:

```
node_modules/@ffmpeg-installer/win32-x64/package.json
  "license": "GPLv3"
  "ffmpeg": "20181217-f22fcd4"
  "homepage": "https://ffmpeg.zeranoe.com/builds/win64/static/"
```

Two separate problems follow from this:

1. **Compliance gap.** The GPLv3 binary is distributed with zero attribution
   or license text anywhere in the repo or the built installer, and GPLv3
   requires that anyone you convey the binary to can obtain its
   corresponding source (either bundled, or via a written offer). Today
   there is neither. Because FFmpeg is invoked here as an arm's-length
   *subprocess* (via `fluent-ffmpeg` + `child_process`, never linked into
   Jontro's own binary), Jontro's own MIT-licensed code is not itself
   "infected" by the GPL under the standard mere-aggregation reading most
   projects rely on for this pattern - but the obligations that attach to
   *redistributing the ffmpeg binary itself* still apply and aren't met.
2. **Stale/unmaintained build.** The bundled binary is dated **December
   2018** - a static build with 6+ years of unpatched FFmpeg CVEs, running
   against user-supplied, potentially untrusted video files. This is a
   security concern independent of licensing.

   The `darwin-x64`/`darwin-arm64` optional packages from the same
   publisher are the same generation of build (versions `4.1.0`/`4.1.5`)
   and should be assumed GPLv3 as well pending direct confirmation - they
   weren't installed on this (Windows) dev machine to inspect directly.

### Recommended fix (not applied automatically - needs your decision)

Jontro's actual FFmpeg usage (`electron/main.ts`) only needs `libmp3lame`
(audio encoding, LGPL) and the `loudnorm` filter (part of `libavfilter`,
LGPL) - **no GPL-only codec (e.g. libx264) is ever invoked.** That means an
FFmpeg build configured *without* GPL components would cover 100% of
Jontro's functionality while sidestepping GPLv3 obligations entirely. Two
paths forward:

- **Preferred, still open:** replace `@ffmpeg-installer/ffmpeg` with a
  current, LGPL-only-configured static build, which also fixes the
  6-year-old-binary security concern. Investigated during this pass:
  - `ffmpeg-static` (the other common npm option) was checked directly via
    the npm registry - it's also `GPL-3.0-or-later`, not a fix.
  - [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds) does publish
    genuine LGPL-tagged static builds, but only for Windows/Linux, not
    macOS, and isn't an npm package with per-platform auto-resolution like
    `@ffmpeg-installer` - adopting it means building custom download/
    checksum-verification tooling per platform, finding a separate trusted
    LGPL source for macOS, and validating actual audio extraction still
    works correctly on real Windows/macOS/Linux hardware. That's a
    multi-day project on its own and too risky to rush against Jontro's
    core paid feature without the ability to test it here.
- **Minimum compliance (done):** `licenses/FFMPEG-NOTICE.md` +
  `licenses/GPLv3-FULL-TEXT.txt` now ship in every installer via
  `extraResources`, with a written offer to provide corresponding source
  on request.

The binary swap itself remains a deliberate follow-up project, not
something to rush through here.

## Tesseract OCR trained language data

`ben.traineddata` / `eng.traineddata` (fetched by `scripts/fetch-tessdata.mjs`,
see the offline-OCR fix below) are published by the `tesseract-ocr` project
under **Apache-2.0** - fully compatible, no action needed.

## Direct npm dependencies

All permissive; no other copyleft licenses found.

| Package | License |
|---|---|
| `@ffmpeg-installer/ffmpeg` (wrapper) | LGPL-2.1 (see critical finding above for the bundled binary) |
| `@tailwindcss/postcss`, `@tailwindcss/vite`, `tailwindcss` | MIT |
| `electron-updater` | MIT |
| `fluent-ffmpeg` | MIT |
| `imagetracerjs` | Unlicense (public domain) |
| `lucide-react` | ISC |
| `pdf-lib` | MIT |
| `pdfjs-dist` | Apache-2.0 |
| `qrcode.react` | ISC |
| `react`, `react-dom` | MIT |
| `react-easy-crop` | MIT |
| `sonner` | MIT |
| `tesseract.js` | Apache-2.0 |
| `zxcvbn` | MIT |
| `electron`, `electron-builder` | MIT |
| `oxlint`, `postcss`, `typescript`, `vite` | MIT / Apache-2.0 |

`sharp` (Apache-2.0) was removed from `package.json` as part of this pass -
it was never imported anywhere and was bundling unused native binaries into
every installer.

## Google Fonts / external CDNs (fixed)

`index.html` previously loaded the "Inter" font from `fonts.googleapis.com`,
and two tools loaded worker/model assets from `cdnjs.cloudflare.com` and
`jsdelivr.net`/`projectnaptha.com` at runtime. These weren't licensing
issues, but they directly contradicted the "0-cloud, 0-telemetry" claim in
`README.md`. See the accompanying code fixes - fonts now use a system font
stack, and PDF.js/Tesseract.js assets are bundled locally instead of
fetched from a CDN on every use.
