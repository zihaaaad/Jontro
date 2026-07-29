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
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required to expose native File.path for media conversion
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

ipcMain.handle('dialog:openDirectory', async () => {
  if (!mainWindow) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (canceled) return null;
  return filePaths[0];
});

import fs from 'fs';

ipcMain.handle('system:saveBuffer', async (event, buffer, defaultName) => {
  if (!mainWindow) return { success: false, error: 'No window' };
  
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Image As',
    defaultPath: defaultName
  });

  if (canceled || !filePath) return { success: false, error: 'Canceled by user' };

  try {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true, outputPath: filePath };
  } catch (err: any) {
    return { success: false, error: err.message };
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

ipcMain.handle('media:extractAudioBulk', async (event, inputPath, outputFolder, fileName) => {
  if (!mainWindow) return { success: false, error: 'No window' };
  
  const outputPath = path.join(outputFolder, fileName);

  return new Promise((resolve) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .on('progress', (progress) => {
         if (progress.percent) {
           mainWindow?.webContents.send('media:extractAudio:progress', progress.percent);
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
