import { useState, useEffect, useRef } from 'react';
import { UploadCloud, X, Download, Settings2, Scissors, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
// @ts-ignore
import ImageTracer from 'imagetracerjs';

export default function VectorTracer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [svgOutput, setSvgOutput] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preset, setPreset] = useState('ultra_perfect');
  
  // Advanced Settings
  const [colorLimit, setColorLimit] = useState(256);
  const [accuracy, setAccuracy] = useState(100);

  // Mirrors previewUrl so the Escape key listener (bound once below) always
  // revokes the *current* blob URL instead of the stale null it closed over at mount.
  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  const presets = [
    { id: 'custom', name: 'Advanced / Custom' },
    { id: 'ultra_perfect', name: 'Ultra Perfect (Algorithm)' },
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
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    setPreviewUrl(null);
    setSvgOutput(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setSvgOutput(null);
      } else {
        toast.error('Please drop a valid image file.');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') removeFile();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const processVectorization = () => {
    if (!previewUrl) return;
    setIsProcessing(true);
    setSvgOutput(null);

    try {
      let options: any = preset;
      
      // ALGORITHMIC UPGRADE: Ultra-Perfect Custom Engine Parameters
      if (preset === 'ultra_perfect') {
        options = {
          colorsampling: 2, numberofcolors: 256, mincolorratio: 0, colorquantcycles: 5, 
          blurradius: 0, blurdelta: 20, strokewidth: 1, linefilter: false, scale: 1,
          roundcoords: 2, viewbox: false, desc: false, lcpr: 0, qcpr: 0,
          ltres: 0.1, qtres: 0.1, pathomit: 0, rightangleenhance: true
        };
      } else if (preset === 'custom') {
        // Linear scale for tolerance: 100% accuracy = 0.01 tolerance (very tight), 1% = 3.0 tolerance (very loose)
        const tol = Math.max(0.01, (101 - accuracy) * 0.03); 
        // Path omit: 100% accuracy = 0 omit, 1% accuracy = 15 omit
        const omit = Math.floor((100 - accuracy) * 0.15);
        options = {
          colorsampling: 2, numberofcolors: colorLimit, mincolorratio: 0, colorquantcycles: 3,
          blurradius: 0, strokewidth: 1, linefilter: false, scale: 1, roundcoords: 1,
          viewbox: false, desc: false, lcpr: 0, qcpr: 0,
          ltres: tol, qtres: tol, pathomit: omit, rightangleenhance: true
        };
      }

      ImageTracer.imageToSVG(previewUrl, (svgstr: string) => {
        setSvgOutput(svgstr);
        setIsProcessing(false);
        toast.success('Vectorization complete!');
      }, options);
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
                className="absolute top-4 right-4 z-50 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-none active:scale-95"
                title="Remove Image (Esc)"
              >
                <X size={16} />
              </button>
              
              {isProcessing && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-zinc-100/70 dark:bg-black/70 backdrop-blur-sm transition-all duration-300">
                  <Loader2 size={48} strokeWidth={1.5} className="text-blue-500 animate-spin mb-4" />
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">Calculating Vectors...</span>
                  <span className="text-xs text-zinc-500 mt-1">This may take a few seconds on high resolution images.</span>
                </div>
              )}
              
              {!svgOutput ? (
                <img 
                  src={previewUrl!} 
                  alt="Original preview" 
                  className={`max-w-full max-h-full object-contain transition-all duration-500 ${isProcessing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                />
              ) : (
                <div 
                  className="max-w-full max-h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full animate-in fade-in zoom-in duration-500"
                  dangerouslySetInnerHTML={{ __html: svgOutput }} 
                />
              )}
            </div>
          ) : (
            <label 
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="flex-1 m-8 border border-dashed border-zinc-300 dark:border-[#404040] hover:border-zinc-400 dark:hover:border-[#838383] bg-zinc-50 hover:bg-zinc-100 dark:bg-[#0e0e0e] dark:hover:bg-[#1a1a1a] rounded-md flex flex-col items-center justify-center p-6 cursor-pointer transition-none"
            >
              <UploadCloud size={32} strokeWidth={1.5} className="text-zinc-500 dark:text-[#838383] mb-4" />
              <span className="text-sm font-medium text-zinc-900 dark:text-[#ededed] mb-1 text-center">
                Drag Image here or click to browse
              </span>
              <span className="text-xs text-zinc-500 dark:text-[#838383] text-center">
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
          <div className="flex items-center text-xs font-semibold text-zinc-500 dark:text-[#838383] uppercase tracking-wider mb-6">
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
                className="w-full bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-300 dark:border-[#404040] rounded text-sm px-3 py-2 text-zinc-900 dark:text-[#ededed] focus:outline-none focus:border-zinc-500 dark:focus:border-[#838383] appearance-none"
              >
                {presets.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-500 dark:text-[#838383] mt-2">
                Experiment with different presets to find the best look for your image.
              </p>
            </div>

            {preset === 'custom' && (
              <div className="pt-4 border-t border-zinc-200 dark:border-[#262626] animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-medium text-zinc-700 dark:text-[#a3a3a3]">Color Palette Limit</label>
                  <span className="text-xs font-mono text-zinc-900 dark:text-[#ededed] bg-zinc-100 dark:bg-[#262626] px-1.5 rounded">{colorLimit}</span>
                </div>
                <input 
                  type="range" min="2" max="256" value={colorLimit} 
                  onChange={e => { setColorLimit(Number(e.target.value)); setSvgOutput(null); }} 
                  className="w-full accent-blue-500" 
                />
                
                <div className="flex justify-between items-center mb-1.5 mt-4">
                  <label className="text-[11px] font-medium text-zinc-700 dark:text-[#a3a3a3]">Detail Accuracy</label>
                  <span className="text-xs font-mono text-zinc-900 dark:text-[#ededed] bg-zinc-100 dark:bg-[#262626] px-1.5 rounded">{accuracy}%</span>
                </div>
                <input 
                  type="range" min="1" max="100" value={accuracy} 
                  onChange={e => { setAccuracy(Number(e.target.value)); setSvgOutput(null); }} 
                  className="w-full accent-blue-500" 
                />
                <p className="text-[9px] text-zinc-500 dark:text-[#555] mt-2 leading-tight">
                  High accuracy retains sharp corners and tiny details, but increases SVG file size.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 mt-6">
            {!svgOutput ? (
              <button 
                onClick={processVectorization}
                disabled={!selectedFile || isProcessing}
                className={`w-full py-2.5 rounded-md text-sm font-medium transition-none flex items-center justify-center ${
                  !selectedFile || isProcessing
                    ? 'bg-zinc-100 dark:bg-[#262626] text-zinc-500 dark:text-[#838383] cursor-not-allowed'
                    : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0e0e0e] active:scale-[0.98]'
                }`}
              >
                <Scissors size={14} className={`mr-2 ${isProcessing ? 'animate-pulse' : ''}`} /> 
                {isProcessing ? 'Tracing...' : 'Trace Image'}
              </button>
            ) : (
              <button 
                onClick={downloadSvg}
                className="w-full py-2.5 rounded-md text-sm font-medium transition-none flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0e0e0e] active:scale-[0.98]"
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
