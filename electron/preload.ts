import { contextBridge, ipcRenderer } from 'electron';

// Expose safe native Windows APIs to the React frontend
contextBridge.exposeInMainWorld('electronAPI', {
  // Dialogs
  openFile: (options?: any) => ipcRenderer.invoke('dialog:openFile', options),
  openMultipleFiles: (options?: any) => ipcRenderer.invoke('dialog:openMultipleFiles', options),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  saveBuffer: (buffer: ArrayBuffer, defaultName: string) => ipcRenderer.invoke('file:saveBuffer', buffer, defaultName),
  saveFilesBulk: (files: {name: string, buffer: ArrayBuffer}[]) => ipcRenderer.invoke('file:saveFilesBulk', files),
  
  // App Info
  getAppVersion: () => ipcRenderer.invoke('system:getAppVersion'),
  
  // Media
  extractAudio: (inputPath: string) => ipcRenderer.invoke('media:extractAudio', inputPath),
  extractAudioBulk: (inputPath: string, outputFolder: string, fileName: string, normalizeAudio: boolean) => ipcRenderer.invoke('media:extractAudioBulk', inputPath, outputFolder, fileName, normalizeAudio),
  onExtractionProgress: (callback: (progress: number) => void) => {
    ipcRenderer.removeAllListeners('media:extractAudio:progress');
    ipcRenderer.on('media:extractAudio:progress', (_event, progress) => callback(progress));
  },
  
  // Native Notifications (Future use)
  sendNotification: (title: string, body: string) => {
    new Notification(title, { body });
  }
});
