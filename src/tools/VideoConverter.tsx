import { useState } from 'react';
import { UploadCloud, X, FileAudio } from 'lucide-react';
import { toast } from 'sonner';

export default function VideoConverter() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'converting' | 'success' | 'error'>('idle');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
      setStatus('idle');
      setProgress(0);
      setCurrentFileIndex(0);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const startConversion = async () => {
    if (selectedFiles.length === 0) return;
    
    if (window.electronAPI) {
      // Ask user where to save the files
      const outFolder = await window.electronAPI.openDirectory();
      if (!outFolder) return; // User canceled folder selection
      
      setStatus('converting');
      setIsConverting(true);
      
      // Wire up progress listener
      window.electronAPI.onExtractionProgress((percent) => {
        setProgress(Math.min(percent, 100));
      });
      
      let successCount = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        setCurrentFileIndex(i);
        setProgress(0);
        const file = selectedFiles[i] as any;
        const inputPath = file.path;
        
        // Generate a new .mp3 filename based on original video name
        const filenameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const outFileName = `${filenameWithoutExt}.mp3`;
        
        try {
          const result = await window.electronAPI.extractAudioBulk(inputPath, outFolder, outFileName);
          if (result.success) {
            successCount++;
          } else {
            toast.error(`Failed on ${file.name}: ${result.error}`);
          }
        } catch (e) {
          toast.error(`Native execution failed for ${file.name}`);
        }
      }
      
      setIsConverting(false);
      
      if (successCount === selectedFiles.length) {
        setStatus('success');
        toast.success(`Successfully extracted ${successCount} files to selected folder!`);
        setSelectedFiles([]); // clear queue on success
      } else if (successCount > 0) {
        setStatus('success');
        toast.success(`Extracted ${successCount} out of ${selectedFiles.length} files.`);
      } else {
        setStatus('error');
      }
    } else {
      toast.error('Cannot run bulk extraction outside of Desktop environment.');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-8">
        <h2 className="text-2xl font-medium text-zinc-900 dark:text-[#ededed]">Video to Audio (Bulk)</h2>
        <p className="text-sm text-zinc-500 dark:text-[#a3a3a3] mt-1">Extract audio tracks from multiple video files locally.</p>
      </div>

      <div className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-md p-8">
        <div className="mb-6">
          <label 
            className="border border-dashed rounded-md flex flex-col items-center justify-center py-12 px-6 cursor-pointer transition-none border-zinc-300 hover:border-zinc-400 bg-zinc-50 dark:border-[#404040] dark:hover:border-[#737373] dark:bg-[#0e0e0e]"
          >
            <UploadCloud size={32} strokeWidth={1.5} className="text-zinc-500 dark:text-[#737373] mb-4" />
            <span className="text-sm font-medium text-zinc-900 dark:text-[#ededed] mb-1">
              Click to select multiple video files
            </span>
            <span className="text-xs text-zinc-500 dark:text-[#737373]">
              Supports .mp4, .mkv, .avi, etc. Processed 100% locally.
            </span>
            <input type="file" accept="video/*" multiple className="hidden" onChange={handleFileSelect} />
          </label>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-medium text-zinc-500 dark:text-[#737373] uppercase tracking-wider mb-3">
              Queue ({selectedFiles.length} files)
            </h3>
            <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
              {selectedFiles.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="flex items-center justify-between p-3 rounded-md bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-200 dark:border-[#262626]">
                  <div className="flex items-center truncate">
                    <FileAudio size={16} className="text-blue-500 mr-3 shrink-0" />
                    <span className="text-sm text-zinc-900 dark:text-[#ededed] truncate">{file.name}</span>
                    <span className="text-xs text-zinc-500 dark:text-[#737373] ml-3 shrink-0">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  {!isConverting && (
                    <button 
                      onClick={() => removeFile(idx)} 
                      className="p-1 text-zinc-400 hover:text-red-500 dark:text-[#555] dark:hover:text-red-400 shrink-0"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Bar for Bulk processing */}
        {status === 'converting' && (
          <div className="mb-8 p-4 rounded-md border border-zinc-200 dark:border-[#262626] bg-zinc-50 dark:bg-[#0e0e0e]">
            <div className="flex flex-col mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-zinc-900 dark:text-[#ededed]">
                  Processing {currentFileIndex + 1} of {selectedFiles.length}
                </span>
                <span className="text-xs font-mono text-zinc-900 dark:text-[#ededed]">{Math.round(progress)}%</span>
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-[#a3a3a3] truncate">
                {selectedFiles[currentFileIndex]?.name}
              </span>
            </div>
            
            <div className="w-full bg-zinc-200 dark:bg-[#262626] h-1 rounded-none overflow-hidden">
              <div 
                className="h-1 bg-blue-500 transition-none"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-[#262626]">
          <button 
            onClick={startConversion}
            disabled={selectedFiles.length === 0 || isConverting}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-none flex items-center ${
              selectedFiles.length === 0 || isConverting
                ? 'bg-zinc-100 dark:bg-[#262626] text-zinc-500 dark:text-[#737373] cursor-not-allowed'
                : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0e0e0e]'
            }`}
          >
            {isConverting ? 'Processing Queue...' : 'Start Bulk Extraction'}
          </button>
        </div>
      </div>
    </div>
  );
}
