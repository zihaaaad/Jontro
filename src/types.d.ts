export {};

declare global {
  interface Window {
    electronAPI?: {
      openFile: (options?: any) => Promise<string | null>;
      openDirectory: () => Promise<string | null>;
      saveBuffer: (buffer: ArrayBuffer, defaultName: string) => Promise<{success: boolean, outputPath?: string, error?: string}>;
      getAppVersion: () => Promise<string>;
      extractAudio: (inputPath: string) => Promise<{success: boolean, outputPath?: string, error?: string}>;
      extractAudioBulk: (inputPath: string, outputFolder: string, fileName: string) => Promise<{success: boolean, error?: string}>;
      onExtractionProgress: (callback: (progress: number) => void) => void;
    };
  }
}
