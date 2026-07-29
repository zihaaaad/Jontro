import { useState } from 'react';
import { UploadCloud, X, Download, Settings2, Scissors } from 'lucide-react';
import { toast } from 'sonner';
// @ts-ignore
import ImageTracer from 'imagetracerjs';

export default function VectorTracer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [svgOutput, setSvgOutput] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preset, setPreset] = useState('default');

  const presets = [
    { id: 'default', name: 'Default' },
    { id: 'posterized1', name: 'Posterized (Layered)' },
    { id: 'posterized2', name: 'Posterized (Simple)' },
    { id: 'curvy', name: 'Curvy & Smooth' },
    { id: 'sharp', name: 'Sharp & Angular' },
    { id: 'detailed', name: 'Detailed' },
    { id: 'smoothed', name: 'Smoothed' },
    { id: 'grayscale', name: 'Grayscale' },
    { id: 'fixedpalette', name: 'Fixed Palette' },
    { id: 'randompalette', name: 'Random Palette' },
    { id: 'bw', name: 'Black & White' },
    { id: 'artistic1', name: 'Artistic 1' }
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setSvgOutput(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSvgOutput(null);
  };

  const processVectorization = () => {
    if (!previewUrl) return;
    setIsProcessing(true);
    setSvgOutput(null);

    // ImageTracer's browser API takes an image URL, a callback, and a preset/options object
    try {
      ImageTracer.imageToSVG(previewUrl, (svgstr: string) => {
        setSvgOutput(svgstr);
        setIsProcessing(false);
        toast.success('Vectorization complete!');
      }, preset);
    } catch (e) {
      console.error(e);
      toast.error('Failed to vectorize image.');
      setIsProcessing(false);
    }
  };

  const downloadSvg = async () => {
    if (!svgOutput) return;

    const originalName = selectedFile?.name.split('.')[0] || 'vectorized';
    
    // Save locally via IPC if available
    if (window.electronAPI && window.electronAPI.saveBuffer) {
      const encoder = new TextEncoder();
      const buffer = encoder.encode(svgOutput).buffer;
      const result = await window.electronAPI.saveBuffer(buffer, `${originalName}.svg`);
      if (result.success) {
        toast.success('SVG exported successfully!');
      } else if (result.error !== 'Canceled by user') {
        toast.error(result.error);
      }
    } else {
      // Browser fallback
      const blob = new Blob([svgOutput], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${originalName}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-8">
        <h2 className="text-2xl font-medium text-zinc-900 dark:text-[#ededed]">Vector Tracer</h2>
        <p className="text-sm text-zinc-500 dark:text-[#a3a3a3] mt-1">Convert raster images (PNG, JPG) into highly accurate SVGs.</p>
      </div>

      <div className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-md overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        {/* Left Panel - Image Area */}
        <div className="flex-1 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-[#262626] flex flex-col relative overflow-hidden bg-zinc-100 dark:bg-[#090909]">
          
          {selectedFile ? (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <button 
                onClick={removeFile}
                className="absolute top-4 right-4 z-50 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-none"
                title="Remove Image"
              >
                <X size={16} />
              </button>
              
              {!svgOutput ? (
                <img 
                  src={previewUrl!} 
                  alt="Original preview" 
                  className={`max-w-full max-h-full object-contain ${isProcessing ? 'opacity-30 blur-sm' : 'opacity-100'}`}
                />
              ) : (
                <div 
                  className="max-w-full max-h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full"
                  dangerouslySetInnerHTML={{ __html: svgOutput }} 
                />
              )}
            </div>
          ) : (
            <label className="flex-1 m-8 border border-dashed border-zinc-300 dark:border-[#404040] hover:border-zinc-400 dark:hover:border-[#737373] bg-zinc-50 dark:bg-[#0e0e0e] rounded-md flex flex-col items-center justify-center p-6 cursor-pointer transition-none">
              <UploadCloud size={32} strokeWidth={1.5} className="text-zinc-500 dark:text-[#737373] mb-4" />
              <span className="text-sm font-medium text-zinc-900 dark:text-[#ededed] mb-1 text-center">
                Select Image to Trace
              </span>
              <span className="text-xs text-zinc-500 dark:text-[#737373] text-center">
                Supports .png, .jpg, .jpeg
              </span>
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/jpg" 
                className="hidden" 
                onChange={handleFileSelect} 
              />
            </label>
          )}

        </div>

        {/* Right Panel - Settings */}
        <div className="w-full md:w-72 bg-white dark:bg-[#141414] p-6 flex flex-col z-20">
          <div className="flex items-center text-xs font-semibold text-zinc-500 dark:text-[#737373] uppercase tracking-wider mb-6">
            <Settings2 size={14} className="mr-2" /> Parameters
          </div>

          <div className="space-y-5 flex-1">
            <div>
              <label className="block text-xs text-zinc-500 dark:text-[#a3a3a3] mb-1.5">Tracing Preset</label>
              <select 
                value={preset}
                onChange={(e) => {
                  setPreset(e.target.value);
                  setSvgOutput(null); // Reset output when preset changes so user can re-trace
                }}
                className="w-full bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-300 dark:border-[#404040] rounded text-sm px-3 py-2 text-zinc-900 dark:text-[#ededed] focus:outline-none focus:border-zinc-500 dark:focus:border-[#737373] appearance-none"
              >
                {presets.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-500 dark:text-[#737373] mt-2">
                Experiment with different presets to find the best look for your image.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-6">
            {!svgOutput ? (
              <button 
                onClick={processVectorization}
                disabled={!selectedFile || isProcessing}
                className={`w-full py-2 rounded-md text-sm font-medium transition-none flex items-center justify-center ${
                  !selectedFile || isProcessing
                    ? 'bg-zinc-100 dark:bg-[#262626] text-zinc-500 dark:text-[#737373] cursor-not-allowed'
                    : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0e0e0e]'
                }`}
              >
                <Scissors size={14} className="mr-2" /> 
                {isProcessing ? 'Tracing...' : 'Trace Image'}
              </button>
            ) : (
              <button 
                onClick={downloadSvg}
                className="w-full py-2 rounded-md text-sm font-medium transition-none flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0e0e0e]"
              >
                <Download size={14} className="mr-2" /> Download SVG
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
