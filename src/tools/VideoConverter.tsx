import { useState } from 'react';
import { UploadCloud, X, FileAudio } from 'lucide-react';
import { toast } from 'sonner';

export default function VideoConverter() {
  const [selectedFiles, setSelectedFiles] = useState<{name: string, path: string}[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'converting' | 'success' | 'error'>('idle');
  const [normalizeAudio, setNormalizeAudio] = useState(false);

  const handleNativeFileSelect = async () => {
    if (window.electronAPI && window.electronAPI.openMultipleFiles) {
      const paths = await window.electronAPI.openMultipleFiles({
        filters: [{ name: 'Videos', extensions: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm'] }]
      });
      if (paths && paths.length > 0) {
        const newFiles = paths.map((p: string) => {
          // Extract filename from path
          const name = p.split('\\').pop()?.split('/').pop() || 'Unknown File';
          return { name, path: p };
        });
        setSelectedFiles(prev => [...prev, ...newFiles]);
        setStatus('idle');
        setProgress(0);
        setCurrentFileIndex(0);
      }
    } else {
      toast.error('Native file selection not available in browser mode.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const videoFiles = files.filter(f => f.type.startsWith('video/') || f.name.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i));
      
      if (videoFiles.length > 0) {
        const newFiles = videoFiles.map(f => ({ name: f.name, path: (f as any).path || f.name }));
        setSelectedFiles(prev => [...prev, ...newFiles]);
        setStatus('idle');
        setProgress(0);
        setCurrentFileIndex(0);
      } else {
        toast.error('Please drop valid video files.');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
      window.electronAPI.onExtractionProgress((percent: number) => {
        setProgress(Math.min(percent, 100));
      });
      
      let successCount = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        setCurrentFileIndex(i);
        setProgress(0);
        const file = selectedFiles[i];
        const inputPath = file.path;
        
        // Generate a new .mp3 filename based on original video name
        const filenameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const outFileName = `${filenameWithoutExt}.mp3`;
        
        try {
          const result = await window.electronAPI.extractAudioBulk(inputPath, outFolder, outFileName, normalizeAudio);
          if (result && result.success) {
            successCount++;
          } else {
            toast.error(`Failed on ${file.name}: ${result?.error || 'Unknown error'}`);
          }
        } catch (e: any) {
          toast.error(`Native execution failed for ${file.name}: ${e.message || 'Check FFmpeg'}`);
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
          <button 
            onClick={handleNativeFileSelect}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="w-full border border-dashed rounded-md flex flex-col items-center justify-center py-12 px-6 cursor-pointer transition-all duration-200 border-zinc-300 hover:border-zinc-400 hover:bg-zinc-100 bg-zinc-50 dark:border-[#404040] dark:hover:border-[#737373] dark:bg-[#0e0e0e] dark:hover:bg-[#1a1a1a]"
          >
            <UploadCloud size={32} strokeWidth={1.5} className="text-zinc-500 dark:text-[#737373] mb-4 transition-transform duration-300 hover:scale-110" />
            <span className="text-sm font-medium text-zinc-900 dark:text-[#ededed] mb-1">
              Click to select multiple video files
            </span>
            <span className="text-xs text-zinc-500 dark:text-[#737373]">
              Supports .mp4, .mkv, .avi, etc. Processed 100% locally.
            </span>
          </button>
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
                className="h-1 bg-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center pt-4 border-t border-zinc-200 dark:border-[#262626] gap-4">
          <label className="flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={normalizeAudio}
              onChange={(e) => setNormalizeAudio(e.target.checked)}
              className="w-4 h-4 rounded-sm border border-zinc-300 dark:border-[#404040] bg-white dark:bg-[#0e0e0e] checked:bg-blue-500 checked:border-blue-500 appearance-none flex items-center justify-center before:content-[''] before:w-2 before:h-2 before:bg-white before:scale-0 checked:before:scale-100 before:transition-transform before:duration-200"
            />
            <span className="ml-3 text-sm text-zinc-700 dark:text-[#ededed]">Apply EBU R128 Loudness Normalization</span>
          </label>
          
          <button 
            onClick={startConversion}
            disabled={selectedFiles.length === 0 || isConverting}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center ${
              selectedFiles.length === 0 || isConverting
                ? 'bg-zinc-100 dark:bg-[#262626] text-zinc-500 dark:text-[#737373] cursor-not-allowed'
                : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0e0e0e] hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isConverting ? 'Processing Queue...' : 'Start Bulk Extraction'}
          </button>
        </div>
      </div>
    </div>
  );
}
