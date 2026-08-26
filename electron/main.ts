import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import os from 'os';
import { autoUpdater } from 'electron-updater';

let lastCpuTimes = getCpuTimes();
function getCpuTimes() {
  const cpus = os.cpus();
  let idle = 0, total = 0;
  cpus.forEach(core => {
    for (let type in core.times) {
      total += core.times[type as keyof typeof core.times];
    }
    idle += core.times.idle;
  });
  return { idle, total };
}

// The built directory structure
//
// ├─┬ dist
// │ └── index.html
// ├─┬ dist-electron
// │ ├── main.js
// │ └── preload.mjs
//

let mainWindow: BrowserWindow | null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    // Below Tailwind's md: breakpoint (768px) so the app's compact/icon-only
    // sidebar layout (built for narrow windows) is actually reachable -
    // it previously couldn't render at all with minWidth: 900.
    minWidth: 640,
    minHeight: 600,
    title: 'Jontro Desktop',
    icon: path.join(__dirname, '../public/jontro-icon.svg'),
    backgroundColor: '#0e0e0e', // Prevents white flash on load
    autoHideMenuBar: true, // Hide messy Windows menu bar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true, // webUtils.getPathForFile() (exposed via preload) works fine sandboxed
      plugins: true, // Enable native Chromium PDF Viewer
    },
  });

  // Without this, any http(s) link clicked in the renderer (e.g. an
  // "Upgrade" or "Buy" link) either silently does nothing or navigates this
  // BrowserWindow itself away from the app - there's no default browser
  // popup handling in Electron. Route external links to the OS browser and
  // deny in-app popups/new windows entirely.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

app.whenReady().then(() => {
  createWindow();

  // Setup auto updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  if (app.isPackaged) {
    // webContents.send() is fire-and-forget - Electron doesn't queue IPC
    // messages for listeners that attach later. Waiting for did-finish-load
    // (the renderer's bundle has run and mounted App.tsx's updater
    // listeners by then) instead of firing this immediately in
    // whenReady() closes the window where a fast update check could
    // resolve and emit its event before anything was listening for it.
    mainWindow?.webContents.once('did-finish-load', () => {
      autoUpdater.checkForUpdatesAndNotify();
    });
  }

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('updater:update-available', info.version);
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('updater:update-downloaded');
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('updater:update-not-available');
  });

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('updater:error', err.message);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Telemetry Stream
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const memUsed = ((os.totalmem() - os.freemem()) / (1024 ** 3)).toFixed(1);
      const memTotal = (os.totalmem() / (1024 ** 3)).toFixed(1);
      
      const currentCpu = getCpuTimes();
      const idleDiff = currentCpu.idle - lastCpuTimes.idle;
      const totalDiff = currentCpu.total - lastCpuTimes.total;
      const cpuUsage = totalDiff === 0 ? 0 : (100 - (100 * idleDiff / totalDiff)).toFixed(0);
      lastCpuTimes = currentCpu;

      mainWindow.webContents.send('system:telemetry', { cpu: cpuUsage, ram: memUsed, ramTotal: memTotal });
    }
  }, 2000);
});

ipcMain.handle('updater:quitAndInstall', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('updater:checkForUpdates', () => {
  if (!app.isPackaged) {
    // electron-updater has no feed URL to hit in dev (no packaged
    // app-update.yml), so report "no update" immediately instead of
    // letting it throw or hang the button forever.
    mainWindow?.webContents.send('updater:update-not-available');
    return;
  }
  autoUpdater.checkForUpdates().catch((err) => {
    mainWindow?.webContents.send('updater:error', err.message);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ==========================================
// NATIVE WINDOWS IPC HANDLERS (The Bridge)
// ==========================================

ipcMain.handle('dialog:openFile', async (event, options) => {
  if (!mainWindow) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    ...options
  });
  if (canceled) return null;
  return filePaths[0];
});

ipcMain.handle('dialog:openMultipleFiles', async (event, options) => {
  if (!mainWindow) return [];
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    ...options
  });
  if (canceled) return [];
  return filePaths;
});

ipcMain.handle('dialog:openDirectory', async () => {
  if (!mainWindow) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (canceled) return null;
  return filePaths[0];
});

import fs from 'fs';

// Two queued files that end up with the same output name (e.g. two source
// videos both named "clip.mp4" from different folders) would otherwise
// silently overwrite each other via fs.writeFileSync with no warning - the
// caller sees "success" even though one output is gone. Appends " (2)",
// " (3)", etc. before the extension whenever a name is already taken,
// tracking taken names across the whole batch so within-batch collisions
// (not just collisions with pre-existing files) are also caught.
function dedupeFileName(outputDir: string, fileName: string, takenInBatch: Set<string>): string {
  const ext = path.extname(fileName);
  const base = fileName.slice(0, fileName.length - ext.length);
  let candidate = fileName;
  let n = 2;
  while (fs.existsSync(path.join(outputDir, candidate)) || takenInBatch.has(candidate)) {
    candidate = `${base} (${n})${ext}`;
    n++;
  }
  takenInBatch.add(candidate);
  return candidate;
}

ipcMain.handle('file:saveBuffer', async (_event, buffer: ArrayBuffer, defaultName: string) => {
  const options = {
    defaultPath: path.join(app.getPath('downloads'), defaultName),
    title: 'Save File',
  };
  const { canceled, filePath } = mainWindow
    ? await dialog.showSaveDialog(mainWindow, options)
    : await dialog.showSaveDialog(options);

  if (canceled || !filePath) {
    return { success: false, error: 'Canceled by user' };
  }

  try {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true, outputPath: filePath };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('file:saveFilesBulk', async (_event, files: {name: string, buffer: ArrayBuffer}[]) => {
  const options = {
    title: 'Select Export Directory',
    properties: ['openDirectory', 'createDirectory'] as const,
  };
  const { canceled, filePaths } = mainWindow
    ? await dialog.showOpenDialog(mainWindow, options)
    : await dialog.showOpenDialog(options);

  if (canceled || filePaths.length === 0) {
    return { success: false, error: 'Canceled by user' };
  }

  const outputDir = filePaths[0];

  try {
    const takenInBatch = new Set<string>();
    for (const file of files) {
      const safeName = dedupeFileName(outputDir, file.name, takenInBatch);
      fs.writeFileSync(path.join(outputDir, safeName), Buffer.from(file.buffer));
    }
    return { success: true, outputPath: outputDir };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

import ffmpeg from 'fluent-ffmpeg';

// Cross-platform binary lookup (was hardcoded to win32-x64, which made
// Video-to-Audio non-functional on any Mac/Linux build). Mirrors the
// platform-dir convention @ffmpeg-installer/ffmpeg itself uses internally,
// but resolved manually because binaries must be read from the physical
// app.asar.unpacked path when packaged - they cannot execute from inside
// the .asar archive even though Electron's fs shim can *read* them there.
const ffmpegPlatformDir = `${process.platform}-${process.arch}`; // e.g. win32-x64, darwin-arm64, darwin-x64
const ffmpegBinaryName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

let ffmpegPath = '';
const prodPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '@ffmpeg-installer', ffmpegPlatformDir, ffmpegBinaryName);
const devPath = path.join(app.getAppPath(), 'node_modules', '@ffmpeg-installer', ffmpegPlatformDir, ffmpegBinaryName);

if (fs.existsSync(prodPath)) {
  ffmpegPath = prodPath;
} else if (fs.existsSync(devPath)) {
  ffmpegPath = devPath;
}

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
} else {
  console.error(`[ffmpeg] No bundled binary found for platform "${ffmpegPlatformDir}". Video-to-Audio conversion will fail until one is installed.`);
}

ipcMain.handle('system:getAppVersion', () => {
  return app.getVersion();
});

ipcMain.handle('media:extractAudio', async (event, inputPath) => {
  if (!mainWindow) return { success: false, error: 'No window' };

  // 1. Ask user where to save the MP3
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Audio As',
    defaultPath: 'extracted_audio.mp3',
    filters: [{ name: 'Audio', extensions: ['mp3'] }]
  });

  if (canceled || !filePath) {
    return { success: false, error: 'Canceled by user' };
  }

  // 2. Run the heavy ffmpeg process and send live progress
  return new Promise((resolve) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .on('progress', (progress) => {
         if (progress.percent) {
           mainWindow?.webContents.send('media:extractAudio:progress', progress.percent);
         } else {
           mainWindow?.webContents.send('media:extractAudio:progress', 45); // Fake indeterminate
         }
      })
      .on('error', (err) => {
         console.error('FFmpeg error:', err);
         resolve({ success: false, error: err.message });
      })
      .on('end', () => {
         mainWindow?.webContents.send('media:extractAudio:progress', 100);
         resolve({ success: true, outputPath: filePath });
      })
      .save(filePath);
  });
});

ipcMain.handle('media:extractAudioBulk', async (event, inputPath, outputFolder, fileName, normalizeAudio) => {
  if (!mainWindow) return { success: false, error: 'No window' };

  // Two queued videos with the same base name (e.g. "clip.mp4" from two
  // different source folders) would otherwise both resolve to the same
  // "clip.mp3" and the second extraction would silently overwrite the
  // first with no warning to the user. Each call runs sequentially
  // (awaited in the renderer's loop), so an existsSync check here also
  // correctly catches collisions against files this same batch already wrote.
  const safeFileName = dedupeFileName(outputFolder, fileName, new Set());
  const outputPath = path.join(outputFolder, safeFileName);

  return new Promise((resolve) => {
    let command = ffmpeg(inputPath)
      .noVideo()
      .audioCodec('libmp3lame');
      
    if (normalizeAudio) {
      // ADVANCED ALGORITHM: EBU R128 Loudness Normalization
      command = command.audioFilters('loudnorm=I=-16:TP=-1.5:LRA=11');
    }

    command.on('progress', (progress) => {
         if (progress.percent) {
           mainWindow?.webContents.send('media:extractAudio:progress', progress.percent);
         } else {
           mainWindow?.webContents.send('media:extractAudio:progress', 45); // Fake indeterminate
         }
      })
      .on('error', (err) => {
         console.error('FFmpeg error:', err);
         resolve({ success: false, error: err.message });
      })
      .on('end', () => {
         mainWindow?.webContents.send('media:extractAudio:progress', 100);
         resolve({ success: true });
      })
      .save(outputPath);
  });
});
