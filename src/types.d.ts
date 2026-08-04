export {};

declare global {
  interface Window {
    electronAPI?: {
      openFile: (options?: any) => Promise<string | null>;
      openMultipleFiles: (options?: any) => Promise<string[]>;
      openDirectory: () => Promise<string | null>;
      saveBuffer: (buffer: ArrayBuffer, defaultName: string) => Promise<{success: boolean, outputPath?: string, error?: string}>;
      saveFilesBulk: (files: {name: string, buffer: ArrayBuffer}[]) => Promise<{success: boolean, outputPath?: string, error?: string}>;
      getPathForFile: (file: File) => string;
      getAppVersion: () => Promise<string>;
      onSystemTelemetry: (callback: (data: {cpu: string, ram: string, ramTotal: string}) => void) => void;
      extractAudio: (inputPath: string) => Promise<{success: boolean, outputPath?: string, error?: string}>;
      extractAudioBulk: (inputPath: string, outputFolder: string, fileName: string, normalizeAudio?: boolean) => Promise<{success: boolean, error?: string}>;
      onExtractionProgress: (callback: (progress: number) => void) => void;
      
      // Auto Updater
      onUpdateAvailable: (callback: (version: string) => void) => void;
      onUpdateDownloaded: (callback: () => void) => void;
      installUpdate: () => void;

      // Native Notifications
      sendNotification: (title: string, body: string) => void;
    };
  }
}
