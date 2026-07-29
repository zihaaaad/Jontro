import { useState, useEffect } from 'react';
import { Languages, Copy, CheckCircle2, UploadCloud, ClipboardPaste, FileText } from 'lucide-react';
import { toast } from 'sonner';
import Tesseract from 'tesseract.js';

export default function OcrTool() {
  const [extractedText, setExtractedText] = useState("");
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
  }, []);

  const processImage = async (file: File) => {
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
      const result = await Tesseract.recognize(file, 'eng', {
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
    } catch (e) {
      toast.error("Failed to extract text. Ensure the image is valid.");
    } finally {
      setIsProcessing(false);
    }
  };

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
                <ClipboardPaste size={48} strokeWidth={1} className="text-zinc-400 dark:text-[#737373]" />
              </div>
              <h3 className="text-base font-medium text-zinc-900 dark:text-[#ededed] mb-2 text-center">Press Ctrl + V</h3>
              <p className="text-sm text-zinc-500 dark:text-[#737373] text-center mb-8 max-w-xs">
                Take a screenshot with Snipping Tool and paste it directly anywhere in the app to begin scanning.
              </p>
              
              <div className="flex items-center w-full max-w-xs mb-8">
                <div className="flex-1 h-px bg-zinc-200 dark:bg-[#262626]"></div>
                <span className="px-4 text-xs font-medium text-zinc-400 dark:text-[#555] uppercase">OR</span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-[#262626]"></div>
              </div>
              
              <label className="border border-dashed border-zinc-300 dark:border-[#404040] hover:border-zinc-400 dark:hover:border-[#737373] bg-zinc-50 dark:bg-[#0e0e0e] rounded-md flex flex-col items-center justify-center p-6 cursor-pointer transition-none w-full max-w-xs">
                <UploadCloud size={24} className="text-zinc-500 dark:text-[#737373] mb-3" />
                <span className="text-sm font-medium text-zinc-900 dark:text-[#ededed]">Browse Image Files</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          ) : (
            <div className="flex-1 relative flex items-center justify-center bg-zinc-100 dark:bg-[#090909] p-4">
              {previewImage && (
                <img 
                  src={previewImage} 
                  alt="Scanning Target" 
                  className={`max-w-full max-h-full object-contain rounded shadow-sm transition-opacity duration-300 ${isProcessing ? 'opacity-30 blur-sm' : 'opacity-100'}`} 
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
            <div className="flex items-center text-xs text-zinc-500 dark:text-[#737373]">
              <Languages size={14} className="mr-2" />
              Engine: <span className="text-zinc-900 dark:text-[#ededed] ml-1 font-medium">Tesseract v5 (ENG)</span>
            </div>
            <button 
              onClick={copyToClipboard}
              disabled={!extractedText || isProcessing}
              className={`flex items-center text-xs transition-none ${
                !extractedText || isProcessing 
                  ? 'text-zinc-400 dark:text-[#555] cursor-not-allowed' 
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-[#737373] dark:hover:text-[#ededed]'
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
