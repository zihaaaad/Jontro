# Third-Party Notice: FFmpeg

Jontro's Video-to-Audio Converter bundles a compiled **FFmpeg** binary
(distributed via the `@ffmpeg-installer` npm packages) to perform audio
extraction and loudness normalization entirely on your machine, with no
network calls.

## License

The bundled binary (`ffmpeg.exe` on Windows) is licensed under the
**GNU General Public License, version 3 (GPLv3)**. The full license text is
included alongside this file as `GPLv3-FULL-TEXT.txt`, and is also available
at <https://www.gnu.org/licenses/gpl-3.0.html>.

- Build identifier: `20181217-f22fcd4` (Windows x64)
- Original source: <https://ffmpeg.zeranoe.com/builds/win64/static/>
- FFmpeg project homepage: <https://ffmpeg.org>

## Written offer for corresponding source

In compliance with GPLv3 §6(b), Jontro's maintainer (Zihad Hasan) will
provide the complete corresponding source code for the exact FFmpeg build
distributed with this application, on request, for as long as required by
the license. Contact **zihad.connects@gmail.com** to request it.

FFmpeg's own source releases matching this era of build are also publicly
archived by the FFmpeg project at <https://ffmpeg.org/releases/>.

## How Jontro uses this binary

FFmpeg is invoked as a separate, arm's-length **subprocess** (via
`fluent-ffmpeg` and Node's `child_process`) - it is never statically or
dynamically linked into Jontro's own compiled code. Jontro's own source is
licensed separately under the MIT License (see `/LICENSE`); this notice
covers only the bundled FFmpeg binary itself.

## Known limitation

This specific build is several years old and has not received upstream
FFmpeg security patches since its release. See `THIRD_PARTY_LICENSES.md`
for the recommended remediation (replacing it with a current, LGPL-only
configured build) - this has not yet been done as of this notice, since it
requires validation on real Windows/macOS/Linux hardware.
