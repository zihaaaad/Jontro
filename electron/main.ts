import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';

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
    minWidth: 900,
    minHeight: 600,
    title: 'Jontro Desktop',
    icon: path.join(__dirname, '../public/jontro-icon.svg'),
    backgroundColor: '#0e0e0e', // Prevents white flash on load
    autoHideMenuBar: true, // Hide messy Windows menu bar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required to expose native File.path for media conversion
      plugins: true, // Enable native Chromium PDF Viewer
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
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

ipcMain.handle('file:saveBuffer', async (_event, buffer: ArrayBuffer, defaultName: string) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: path.join(app.getPath('downloads'), defaultName),
    title: 'Save File',
  });

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
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Select Export Directory',
    properties: ['openDirectory', 'createDirectory']
  });

  if (canceled || filePaths.length === 0) {
    return { success: false, error: 'Canceled by user' };
  }

  const outputDir = filePaths[0];

  try {
    for (const file of files) {
      fs.writeFileSync(path.join(outputDir, file.name), Buffer.from(file.buffer));
    }
    return { success: true, outputPath: outputDir };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

import ffmpeg from 'fluent-ffmpeg';


let ffmpegPath = '';
const prodPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '@ffmpeg-installer', 'win32-x64', 'ffmpeg.exe');
const devPath = path.join(app.getAppPath(), 'node_modules', '@ffmpeg-installer', 'win32-x64', 'ffmpeg.exe');

if (fs.existsSync(prodPath)) {
  ffmpegPath = prodPath;
} else if (fs.existsSync(devPath)) {
  ffmpegPath = devPath;
}

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
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
  
  const outputPath = path.join(outputFolder, fileName);

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
