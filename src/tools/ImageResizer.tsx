import { useState, useEffect, useCallback } from 'react';
import { UploadCloud, Settings2, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import Cropper from 'react-easy-crop';

interface Area {
  width: number;
  height: number;
  x: number;
  y: number;
}

export default function ImageResizer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [format, setFormat] = useState('Same as original');
  const [filter, setFilter] = useState('Original');
  const [isExporting, setIsExporting] = useState(false);
  
  // Cropper state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [originalAspect, setOriginalAspect] = useState<number>(1);

  // Cleanup memory leak when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Cleanup previous preview if it exists
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      // Load image to read its native dimensions
      const img = new Image();
      img.onload = () => {
        setWidth(img.width.toString());
        setHeight(img.height.toString());
        setOriginalAspect(img.width / img.height);
      };
      img.src = url;
    }
  };

  const clearImage = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setWidth('');
    setHeight('');
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleExport = async () => {
    if (!selectedFile || !previewUrl || !croppedAreaPixels) return;
    setIsExporting(true);

    try {
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = previewUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const targetW = parseInt(width) || croppedAreaPixels.width;
      const targetH = parseInt(height) || croppedAreaPixels.height;
      
      canvas.width = targetW;
      canvas.height = targetH;
      
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(
          img,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          targetW,
          targetH
        );
        
        // ALGORITHMIC PIXEL MANIPULATION (Grayscale Filter)
        if (filter === 'Grayscale') {
          const imgData = ctx.getImageData(0, 0, targetW, targetH);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            // Advanced human-eye weighted luminance formula
            const gray = (r * 0.299) + (g * 0.587) + (b * 0.114);
            data[i] = data[i+1] = data[i+2] = gray;
          }
          ctx.putImageData(imgData, 0, 0);
        }
      }

      const mimeType = format === 'JPEG' ? 'image/jpeg' : format === 'WEBP' ? 'image/webp' : format === 'PNG' ? 'image/png' : selectedFile.type;
      
      const blob: Blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b!), mimeType, 0.95);
      });

      const buffer = await blob.arrayBuffer();
      
      let ext = selectedFile.name.split('.').pop() || 'png';
      if (format === 'JPEG') ext = 'jpg';
      if (format === 'WEBP') ext = 'webp';
      if (format === 'PNG') ext = 'png';
      
      const outName = `resized_${selectedFile.name.split('.')[0]}.${ext}`;
      
      if (window.electronAPI && window.electronAPI.saveBuffer) {
        const result = await window.electronAPI.saveBuffer(buffer, outName);
        if (result.success) {
          toast.success('Image cropped and exported successfully!');
        } else if (result.error !== 'Canceled by user') {
          toast.error(result.error || 'Failed to save image');
        }
      } else {
        toast.error('Native file saving not available in browser sandbox.');
      }
    } catch (e) {
      toast.error('Failed to process image');
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate cropper aspect ratio dynamically based on user input
  const currentAspect = (parseInt(width) > 0 && parseInt(height) > 0) 
    ? parseInt(width) / parseInt(height) 
    : originalAspect;

  return (
    <div className="h-full flex flex-col">
      <div className="mb-8">
        <h2 className="text-2xl font-medium text-zinc-900 dark:text-[#ededed]">Image Resizer</h2>
        <p className="text-sm text-zinc-500 dark:text-[#a3a3a3] mt-1">Resize, crop, and convert image formats instantly without quality loss.</p>
      </div>

      <div className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-md overflow-hidden flex flex-col md:flex-row flex-1 min-h-[400px]">
        {/* Left Panel - Upload & Crop Area */}
        <div className="flex-1 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-[#262626] flex flex-col relative overflow-hidden bg-zinc-100 dark:bg-[#090909]">
          
          {previewUrl ? (
            <div className="relative w-full h-full flex-1 min-h-[350px]">
              <Cropper
                image={previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={currentAspect}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                showGrid={true}
              />
              <button 
                onClick={clearImage}
                className="absolute top-4 right-4 z-50 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-none"
                title="Clear Image"
              >
                <X size={16} />
              </button>
              
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white/90 dark:bg-[#141414]/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-zinc-200 dark:border-[#262626] flex items-center gap-3">
                <span className="text-xs font-medium text-zinc-700 dark:text-[#a3a3a3]">Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-24 accent-blue-500"
                />
              </div>
            </div>
          ) : (
            <label className="flex-1 m-8 border border-dashed border-zinc-300 dark:border-[#404040] hover:border-zinc-400 dark:hover:border-[#737373] bg-zinc-50 dark:bg-[#0e0e0e] rounded-md flex flex-col items-center justify-center p-6 cursor-pointer transition-none">
              <UploadCloud size={32} strokeWidth={1.5} className="text-zinc-500 dark:text-[#737373] mb-4" />
              <span className="text-sm font-medium text-zinc-900 dark:text-[#ededed] mb-1 text-center">
                Drag image here
              </span>
              <span className="text-xs text-zinc-500 dark:text-[#737373] text-center">
                PNG, JPG, WEBP
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            </label>
          )}
        </div>

        {/* Right Panel - Settings */}
        <div className="w-full md:w-72 bg-white dark:bg-[#141414] p-6 flex flex-col relative z-20">
          <div className="flex items-center text-xs font-semibold text-zinc-500 dark:text-[#737373] uppercase tracking-wider mb-6">
            <Settings2 size={14} className="mr-2" /> Parameters
          </div>

          <div className="space-y-5 flex-1">
            <div>
              <label className="block text-xs text-zinc-500 dark:text-[#a3a3a3] mb-1.5 flex justify-between">
                <span>Width (px)</span>
                {previewUrl && <span className="text-blue-500">Auto Aspect</span>}
              </label>
              <input 
                type="number" 
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="Original" 
                className="w-full bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-300 dark:border-[#404040] rounded text-sm px-3 py-2 text-zinc-900 dark:text-[#ededed] focus:outline-none focus:border-zinc-500 dark:focus:border-[#737373]" 
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 dark:text-[#a3a3a3] mb-1.5">Height (px)</label>
              <input 
                type="number" 
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="Original" 
                className="w-full bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-300 dark:border-[#404040] rounded text-sm px-3 py-2 text-zinc-900 dark:text-[#ededed] focus:outline-none focus:border-zinc-500 dark:focus:border-[#737373]" 
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 dark:text-[#a3a3a3] mb-1.5">Algorithmic Filter</label>
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-300 dark:border-[#404040] rounded text-sm px-3 py-2 text-zinc-900 dark:text-[#ededed] focus:outline-none focus:border-zinc-500 dark:focus:border-[#737373] appearance-none"
              >
                <option>Original</option>
                <option>Grayscale</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-zinc-500 dark:text-[#a3a3a3] mb-1.5">Output Format</label>
              <select 
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-300 dark:border-[#404040] rounded text-sm px-3 py-2 text-zinc-900 dark:text-[#ededed] focus:outline-none focus:border-zinc-500 dark:focus:border-[#737373] appearance-none"
              >
                <option>Same as original</option>
                <option>JPEG</option>
                <option>PNG</option>
                <option>WEBP</option>
              </select>
            </div>
          </div>

          <button 
            onClick={handleExport}
            disabled={!selectedFile || isExporting}
            className={`w-full mt-6 py-2 rounded-md text-sm font-medium transition-none flex items-center justify-center ${
              !selectedFile || isExporting
                ? 'bg-zinc-100 dark:bg-[#262626] text-zinc-500 dark:text-[#737373] cursor-not-allowed'
                : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0e0e0e]'
            }`}
          >
            <Download size={16} className="mr-2" /> 
            {isExporting ? 'Exporting...' : 'Export Image'}
          </button>
        </div>
      </div>
    </div>
  );
}
