import { useState, useEffect, useCallback } from 'react';
import { Languages, Copy, CheckCircle2, UploadCloud, ClipboardPaste, FileText } from 'lucide-react';
import { toast } from 'sonner';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Fully offline Tesseract config. Without these, tesseract.js defaults to
// pulling its worker script, WASM core, and trained language data from
// jsdelivr.net / projectnaptha.com CDNs on every single scan - the opposite
// of "completely offline" (see public/vendor/tesseract-*, scripts/fetch-tessdata.mjs).
const TESSERACT_OPTIONS = {
  workerPath: `${import.meta.env.BASE_URL}vendor/tesseract-worker/worker.min.js`,
  corePath: `${import.meta.env.BASE_URL}vendor/tesseract-core`,
  langPath: `${import.meta.env.BASE_URL}tessdata`,
  gzip: true,
};

export default function OcrTool() {
  const [extractedText, setExtractedText] = useState("");
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [language, setLanguage] = useState('ben+eng');

  // Releases the blob URL on unmount too, not just when the next scan
  // starts - without this, navigating away from the tool after a single
  // scan (never coming back to trigger the next processImage's manual
  // revoke) leaks that blob for the rest of the app session.
  useEffect(() => {
    return () => {
      if (previewImage) URL.revokeObjectURL(previewImage);
    };
  }, [previewImage]);

  // useCallback (with the state it actually reads as deps) so the paste
  // listener below always re-binds to a fresh closure instead of forever
  // seeing isProcessing/previewImage/language as they were at mount.
  const processImage = useCallback(async (file: File) => {
    if (isProcessing) {
      toast.warning("Please wait for the current scan to finish.");
      return;
    }
    
    // Revoke old URL to prevent memory leaks
    if (previewImage) URL.revokeObjectURL(previewImage);
    
    const url = URL.createObjectURL(file);
    setPreviewImage(url);
    setIsProcessing(true);
    setExtractedText("");
    setProgress(0);
    
    try {
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) } as any).promise;
        let allText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
          setProgress(((i - 1) / pdf.numPages) * 100);
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 }); // 2x upscale for better OCR
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          
          await page.render({ canvasContext: ctx, viewport } as any).promise;
          
          // Grayscale & Contrast stretching on PDF canvas
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          let minL = 255; let maxL = 0;
          for (let j = 0; j < data.length; j += 4) {
            const v = 0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2];
            data[j] = data[j + 1] = data[j + 2] = v;
            if (v < minL) minL = v;
            if (v > maxL) maxL = v;
          }
          const range = maxL - minL;
          if (range > 0) {
            for (let j = 0; j < data.length; j += 4) {
              data[j] = data[j + 1] = data[j + 2] = ((data[j] - minL) / range) * 255;
            }
          }
          ctx.putImageData(imgData, 0, 0);
          
          const processedDataUrl = canvas.toDataURL('image/png');
          const result = await Tesseract.recognize(processedDataUrl, language, {
            ...TESSERACT_OPTIONS,
            logger: m => {
              if (m.status === 'recognizing text') {
                const pageBaseProgress = ((i - 1) / pdf.numPages) * 100;
                const pageProgress = (m.progress * 100) / pdf.numPages;
                setProgress(pageBaseProgress + pageProgress);
              }
            }
          });
          allText += result.data.text + "\n\n";
        }
        
        if (!allText.trim()) {
          toast.error("No text could be found in this PDF.");
          setExtractedText("No text detected. Try another file.");
        } else {
          setExtractedText(allText.trim());
          toast.success("PDF text extracted successfully!");
        }
      } else {
        // ADVANCED ALGORITHM: Upscaling & Contrast Stretching Pre-processing for Tesseract LSTM
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      
      const scale = 2; // Upscale for better OCR accuracy on small screenshots
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        // Find min and max luminance for contrast stretching
        let minL = 255;
        let maxL = 0;
        
        // Pass 1: Convert to grayscale and find min/max
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const v = 0.2126 * r + 0.7152 * g + 0.0722 * b; // Luminance
          data[i] = data[i + 1] = data[i + 2] = v;
          if (v < minL) minL = v;
          if (v > maxL) maxL = v;
        }
        
        // Pass 2: Stretch contrast (normalization) to 0-255 range
        const range = maxL - minL;
        if (range > 0) {
          for (let i = 0; i < data.length; i += 4) {
            const v = data[i];
            const stretched = ((v - minL) / range) * 255;
            data[i] = data[i + 1] = data[i + 2] = stretched;
          }
        }
        
        ctx.putImageData(imgData, 0, 0);
        
        const processedDataUrl = canvas.toDataURL('image/png');
        
        const result = await Tesseract.recognize(processedDataUrl, language, {
          ...TESSERACT_OPTIONS,
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(m.progress * 100);
            }
          }
        });
        
        if (!result.data.text.trim()) {
          toast.error("No text could be found in this image.");
          setExtractedText("No text detected. Try another image with clearer text.");
        } else {
          setExtractedText(result.data.text);
          toast.success("Text extracted successfully!");
        }
      }
      }
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      if (msg.includes('tessdata') || msg.includes('traineddata') || msg.toLowerCase().includes('fetch')) {
        toast.error("OCR language data not found.", {
          description: "Run 'npm run fetch:tessdata' once to download the offline language models.",
          duration: 8000,
        });
      } else {
        toast.error("Failed to extract text. Ensure the file is valid.");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, previewImage, language]);

  // Listen for Clipboard Paste events natively
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault(); // stop default paste
            processImage(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processImage]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImage(e.target.files[0]);
    }
  };

  const copyToClipboard = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    toast.success('Text copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-medium text-zinc-900 dark:text-[#ededed]">Local OCR Scanner</h2>
          <p className="text-sm text-zinc-500 dark:text-[#a3a3a3] mt-1">Extract text from images or screenshots completely offline.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-[500px]">
        {/* Left Side: Upload / Preview */}
        <div className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-md flex flex-col overflow-hidden relative">
          {!previewImage && !isProcessing ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="bg-zinc-100 dark:bg-[#0e0e0e] border border-zinc-200 dark:border-[#262626] rounded-full p-6 mb-6">
                <ClipboardPaste size={48} strokeWidth={1} className="text-zinc-400 dark:text-[#838383]" />
              </div>
              <h3 className="text-base font-medium text-zinc-900 dark:text-[#ededed] mb-2 text-center">Press Ctrl + V</h3>
              <p className="text-sm text-zinc-500 dark:text-[#838383] text-center mb-8 max-w-xs">
                Take a screenshot with Snipping Tool and paste it directly anywhere in the app to begin scanning.
              </p>
              
              <div className="flex items-center w-full max-w-xs mb-8">
                <div className="flex-1 h-px bg-zinc-200 dark:bg-[#262626]"></div>
                <span className="px-4 text-xs font-medium text-zinc-400 dark:text-[#555] uppercase">OR</span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-[#262626]"></div>
              </div>
              
              <label className="border border-dashed border-zinc-300 dark:border-[#404040] hover:border-zinc-400 dark:hover:border-[#838383] bg-zinc-50 dark:bg-[#0e0e0e] rounded-md flex flex-col items-center justify-center p-6 cursor-pointer transition-none w-full max-w-xs">
                <UploadCloud size={24} className="text-zinc-500 dark:text-[#838383] mb-3" />
                <span className="text-sm font-medium text-zinc-900 dark:text-[#ededed]">Browse Image or PDF</span>
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          ) : (
            <div className="flex-1 relative flex items-center justify-center bg-zinc-100 dark:bg-[#090909] p-4">
              {previewImage && (
                <img 
                  src={previewImage} 
                  alt="Scanning Target" 
                  className={`max-w-full max-h-full object-contain rounded shadow-sm transition-none ${isProcessing ? 'opacity-30 blur-sm' : 'opacity-100'}`} 
                />
              )}
              
              {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-zinc-200 dark:border-[#262626] border-t-blue-500 animate-spin mb-6"></div>
                  <div className="bg-white/90 dark:bg-[#141414]/90 backdrop-blur px-6 py-3 rounded-full shadow-lg border border-zinc-200 dark:border-[#262626]">
                    <span className="text-sm font-medium text-zinc-900 dark:text-[#ededed] block text-center mb-1">
                      Running Neural Engine...
                    </span>
                    <span className="text-xs font-mono text-blue-500 text-center block">
                      {Math.round(progress)}% Complete
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Output */}
        <div className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-md p-6 flex flex-col relative">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-200 dark:border-[#262626] pb-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-xs text-zinc-500 dark:text-[#838383]">
                <Languages size={14} className="mr-2" />
                <span className="mr-2">Language:</span>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={isProcessing}
                  className="bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-300 dark:border-[#404040] rounded text-xs px-2 py-1 text-zinc-900 dark:text-[#ededed] focus:outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="ben">Bengali (Best)</option>
                  <option value="ben+eng">Bengali + English</option>
                  <option value="eng">English Only</option>
                </select>
              </div>
            </div>
            <button 
              onClick={copyToClipboard}
              disabled={!extractedText || isProcessing}
              className={`flex items-center text-xs transition-none ${
                !extractedText || isProcessing 
                  ? 'text-zinc-400 dark:text-[#555] cursor-not-allowed' 
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-[#838383] dark:hover:text-[#ededed]'
              }`}
            >
              {copied ? <CheckCircle2 size={14} className="text-zinc-900 dark:text-[#ededed] mr-1.5" /> : <Copy size={14} className="mr-1.5" />}
              {copied ? 'Copied' : 'Copy Output'}
            </button>
          </div>

          <div className="flex-1 relative">
            {!extractedText && !isProcessing ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-50">
                <FileText size={48} strokeWidth={1} className="text-zinc-300 dark:text-[#404040] mb-4" />
                <p className="text-sm text-zinc-400 dark:text-[#555] text-center px-8">
                  Extracted text will appear here.
                </p>
              </div>
            ) : (
              <textarea 
                className="w-full h-full bg-transparent resize-none border-none focus:outline-none text-zinc-800 dark:text-[#d4d4d4] text-sm leading-relaxed custom-scrollbar placeholder-zinc-300 dark:placeholder-[#404040]"
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                placeholder={isProcessing ? "Scanning..." : ""}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
