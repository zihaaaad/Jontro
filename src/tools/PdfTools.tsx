import { useState } from 'react';
import { Merge, SplitSquareHorizontal, FilePlus, X, ArrowLeft, Download, FileText, Settings2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PDFDocument } from 'pdf-lib';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

export default function PdfTools() {
  const [activeTool, setActiveTool] = useState<'none' | 'merge' | 'split' | 'to-image'>('none');
  
  // Merge State
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  
  // Split / To-Image State
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [splitRange, setSplitRange] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMergeFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setMergeFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
    }
  };

  const handleSplitFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSplitFile(e.target.files[0]);
    }
  };

  const handleMergeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      if (files.length > 0) {
        setMergeFiles(prev => [...prev, ...files]);
      } else {
        toast.error('Please drop valid PDF files.');
      }
    }
  };

  const handleSplitDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setSplitFile(file);
      } else {
        toast.error('Please drop a valid PDF file.');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeMergeFile = (index: number) => {
    setMergeFiles(prev => prev.filter((_, i) => i !== index));
  };

  const executeMerge = async () => {
    if (mergeFiles.length < 2) {
      toast.error("Please select at least 2 PDF files to merge.");
      return;
    }
    
    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const file of mergeFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      
      const mergedPdfFile = await mergedPdf.save();
      
      if (window.electronAPI && window.electronAPI.saveBuffer) {
        const result = await window.electronAPI.saveBuffer(mergedPdfFile.buffer as ArrayBuffer, 'Merged_Document.pdf');
        if (result.success) {
          toast.success('PDFs merged successfully!');
          setMergeFiles([]);
        } else if (result.error !== 'Canceled by user') {
          toast.error(result.error);
        }
      } else {
        toast.error('Native file saving not available in browser sandbox.');
      }
    } catch {
      toast.error('Error merging PDFs. Ensure they are valid, unencrypted PDF files.');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeSplit = async () => {
    if (!splitFile) return;
    setIsProcessing(true);
    
    try {
      const arrayBuffer = await splitFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const totalPages = pdf.getPageCount();
      
      let pagesToExtract: number[] = [];
      const parts = splitRange.split(',').map(s => s.trim()).filter(Boolean);
      
      if (parts.length === 0) {
        toast.error('Please enter a valid page range.');
        setIsProcessing(false);
        return;
      }

      for (const part of parts) {
        if (part.includes('-')) {
          const rangeParts = part.split('-');
          if (rangeParts.length !== 2) {
             toast.error(`Invalid range format: ${part}`);
             setIsProcessing(false);
             return;
          }
          const start = parseInt(rangeParts[0].trim());
          const end = parseInt(rangeParts[1].trim());
          if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
             toast.error(`Invalid range ${part}. Document has ${totalPages} pages.`);
             setIsProcessing(false);
             return;
          }
          for (let i = start; i <= end; i++) {
             if (!pagesToExtract.includes(i - 1)) pagesToExtract.push(i - 1); // 0-indexed
          }
        } else {
          const page = parseInt(part);
          if (isNaN(page) || page < 1 || page > totalPages) {
             toast.error(`Invalid page number: ${part}`);
             setIsProcessing(false);
             return;
          }
          if (!pagesToExtract.includes(page - 1)) pagesToExtract.push(page - 1);
        }
      }
      
      // Sort pages sequentially so they extract in order regardless of how user typed them
      pagesToExtract.sort((a, b) => a - b);
      
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdf, pagesToExtract);
      copiedPages.forEach((page) => newPdf.addPage(page));
      
      const newPdfFile = await newPdf.save();
      
      if (window.electronAPI && window.electronAPI.saveBuffer) {
        const result = await window.electronAPI.saveBuffer(newPdfFile.buffer as ArrayBuffer, `Extracted_${splitFile.name}`);
        if (result.success) {
          toast.success('PDF split successfully!');
          setSplitFile(null);
          setSplitRange('');
        } else if (result.error !== 'Canceled by user') {
          toast.error(result.error);
        }
      } else {
        toast.error('Native file saving not available in browser sandbox.');
      }
    } catch {
       toast.error('Error splitting PDF. Ensure it is a valid, unencrypted PDF file.');
    } finally {
       setIsProcessing(false);
    }
  };

  const executePdfToImage = async () => {
    if (!splitFile) return;
    setIsProcessing(true);
    
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

      const arrayBuffer = await splitFile.arrayBuffer();
      // @ts-ignore - pdfjs-dist types mismatch for getDocument
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const totalPages = pdf.numPages;
      
      const files: {name: string, buffer: ArrayBuffer}[] = [];
      toast.info(`Converting ${totalPages} pages to images...`);
      
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High res
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // @ts-ignore - pdfjs-dist types mismatch for render
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
        if (blob) {
          const buffer = await blob.arrayBuffer();
          files.push({ name: `Page_${i}.png`, buffer });
        }
      }
      
      if (window.electronAPI && window.electronAPI.saveFilesBulk) {
        const result = await window.electronAPI.saveFilesBulk(files);
        if (result.success) {
          toast.success(`Exported ${files.length} images successfully!`);
          setSplitFile(null);
        } else if (result.error !== 'Canceled by user') {
          toast.error(result.error);
        }
      } else {
        toast.error('Native bulk file saving not available in browser sandbox.');
      }
    } catch(e) {
      console.error(e);
      toast.error('Error converting PDF to images.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium text-zinc-900 dark:text-[#ededed] flex items-center">
            {activeTool !== 'none' && (
              <button 
                onClick={() => setActiveTool('none')} 
                className="mr-3 p-1 rounded hover:bg-zinc-100 dark:hover:bg-[#262626] transition-none"
              >
                <ArrowLeft size={20} className="text-zinc-500 dark:text-[#a3a3a3]" />
              </button>
            )}
            PDF Tools {activeTool === 'merge' && '- Merge'} {activeTool === 'split' && '- Split'} {activeTool === 'to-image' && '- To Images'}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-[#a3a3a3] mt-1">
            {activeTool === 'none' ? 'Locally manipulate PDF documents securely.' : 'Processed 100% locally on your machine.'}
          </p>
        </div>
      </div>

      {activeTool === 'none' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            onClick={() => setActiveTool('merge')}
            className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] hover:border-zinc-400 dark:hover:border-[#404040] rounded-md p-6 cursor-pointer group transition-none"
          >
            <div className="w-10 h-10 bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-200 dark:border-[#262626] rounded-md flex items-center justify-center mb-4 transition-none">
              <Merge size={18} className="text-zinc-500 dark:text-[#a3a3a3] group-hover:text-zinc-900 dark:group-hover:text-[#ededed] transition-colors" />
            </div>
            <h3 className="text-base font-medium text-zinc-900 dark:text-[#ededed] mb-1">Merge PDFs</h3>
            <p className="text-xs text-zinc-500 dark:text-[#838383] leading-relaxed">Combine multiple independent PDF files sequentially into a single document.</p>
          </div>

          <div 
            onClick={() => setActiveTool('split')}
            className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] hover:border-zinc-400 dark:hover:border-[#404040] rounded-md p-6 cursor-pointer group transition-none"
          >
            <div className="w-10 h-10 bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-200 dark:border-[#262626] rounded-md flex items-center justify-center mb-4 transition-none">
              <SplitSquareHorizontal size={18} className="text-zinc-500 dark:text-[#a3a3a3] group-hover:text-zinc-900 dark:group-hover:text-[#ededed] transition-colors" />
            </div>
            <h3 className="text-base font-medium text-zinc-900 dark:text-[#ededed] mb-1">Split PDF</h3>
            <p className="text-xs text-zinc-500 dark:text-[#838383] leading-relaxed">Extract specific pages or chunk a large PDF into multiple smaller files.</p>
          </div>

          <div 
            onClick={() => setActiveTool('to-image')}
            className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] hover:border-zinc-400 dark:hover:border-[#404040] rounded-md p-6 cursor-pointer group transition-none"
          >
            <div className="w-10 h-10 bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-200 dark:border-[#262626] rounded-md flex items-center justify-center mb-4 transition-none">
              <ImageIcon size={18} className="text-zinc-500 dark:text-[#a3a3a3] group-hover:text-zinc-900 dark:group-hover:text-[#ededed] transition-colors" />
            </div>
            <h3 className="text-base font-medium text-zinc-900 dark:text-[#ededed] mb-1">PDF to Images</h3>
            <p className="text-xs text-zinc-500 dark:text-[#838383] leading-relaxed">Rasterize each page of your PDF into high-quality PNG images.</p>
          </div>
        </div>
      )}

      {/* MERGE UI */}
      {activeTool === 'merge' && (
        <div className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-md p-8">
          <label 
            onDrop={handleMergeDrop}
            onDragOver={handleDragOver}
            className="border border-dashed border-zinc-300 dark:border-[#404040] hover:border-zinc-400 dark:hover:border-[#838383] bg-zinc-50 hover:bg-zinc-100 dark:bg-[#0e0e0e] dark:hover:bg-[#1a1a1a] rounded-md flex flex-col items-center justify-center p-8 cursor-pointer transition-none mb-6"
          >
            <FilePlus size={32} strokeWidth={1.5} className="text-zinc-500 dark:text-[#838383] mb-4" />
            <span className="text-sm font-medium text-zinc-900 dark:text-[#ededed] mb-1">
              Drag PDFs here or browse
            </span>
            <span className="text-xs text-zinc-500 dark:text-[#838383]">
              Select multiple files to combine
            </span>
            <input type="file" accept="application/pdf" multiple className="hidden" onChange={handleMergeFiles} />
          </label>

          {mergeFiles.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-medium text-zinc-500 dark:text-[#838383] uppercase tracking-wider mb-3">
                Merge Queue ({mergeFiles.length})
              </h3>
              <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                {mergeFiles.map((file, idx) => (
                  <div key={`${file.name}-${idx}`} className="flex items-center justify-between p-3 rounded-md bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-200 dark:border-[#262626]">
                    <div className="flex items-center truncate">
                      <FileText size={16} className="text-red-500 mr-3 shrink-0" />
                      <span className="text-sm text-zinc-900 dark:text-[#ededed] truncate">{file.name}</span>
                    </div>
                    <button 
                      onClick={() => removeMergeFile(idx)} 
                      className="p-1 text-zinc-400 hover:text-red-500 dark:text-[#555] dark:hover:text-red-400 shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end border-t border-zinc-200 dark:border-[#262626] pt-4">
            <button 
              onClick={executeMerge}
              disabled={mergeFiles.length < 2 || isProcessing}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-none flex items-center ${
                mergeFiles.length < 2 || isProcessing
                  ? 'bg-zinc-100 dark:bg-[#262626] text-zinc-500 dark:text-[#838383] cursor-not-allowed'
                  : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0e0e0e] active:scale-[0.98]'
              }`}
            >
              {isProcessing ? 'Merging...' : 'Merge & Export'}
            </button>
          </div>
        </div>
      )}

      {/* SPLIT UI */}
      {activeTool === 'split' && (
        <div className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-md overflow-hidden flex flex-col md:flex-row min-h-[400px]">
          <div className="flex-1 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-[#262626] flex flex-col relative overflow-hidden bg-zinc-100 dark:bg-[#090909]">
            {splitFile ? (
              <div className="relative w-full h-full flex-1 min-h-[350px]">
                <embed 
                  src={`${URL.createObjectURL(splitFile)}#toolbar=0&navpanes=0&scrollbar=0`} 
                  type="application/pdf" 
                  className="w-full h-full"
                />
                <button 
                  onClick={() => setSplitFile(null)}
                  className="absolute top-4 right-4 z-50 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-none"
                  title="Remove PDF"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label 
                onDrop={handleSplitDrop}
                onDragOver={handleDragOver}
                className="flex-1 m-8 border border-dashed border-zinc-300 dark:border-[#404040] hover:border-zinc-400 dark:hover:border-[#838383] bg-zinc-50 hover:bg-zinc-100 dark:bg-[#0e0e0e] dark:hover:bg-[#1a1a1a] rounded-md flex flex-col items-center justify-center p-6 cursor-pointer transition-none"
              >
                <FileText size={32} strokeWidth={1.5} className="text-zinc-500 dark:text-[#838383] mb-4" />
                <span className="text-sm font-medium text-zinc-900 dark:text-[#ededed] mb-1 text-center">
                  Drag PDF here to Split
                </span>
                <span className="text-xs text-zinc-500 dark:text-[#838383] text-center">
                  Only .pdf files supported
                </span>
                <input type="file" accept="application/pdf" className="hidden" onChange={handleSplitFile} />
              </label>
            )}
          </div>

          <div className="w-full md:w-72 bg-white dark:bg-[#141414] p-6 flex flex-col">
            <div className="flex items-center text-xs font-semibold text-zinc-500 dark:text-[#838383] uppercase tracking-wider mb-6">
              <Settings2 size={14} className="mr-2" /> Parameters
            </div>

            <div className="space-y-5 flex-1">
              <div>
                <label className="block text-xs text-zinc-500 dark:text-[#a3a3a3] mb-1.5">Pages to Extract</label>
                <input 
                  type="text" 
                  value={splitRange}
                  onChange={(e) => setSplitRange(e.target.value)}
                  placeholder="e.g. 1-5 or 3" 
                  className="w-full bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-300 dark:border-[#404040] rounded text-sm px-3 py-2 text-zinc-900 dark:text-[#ededed] focus:outline-none focus:border-zinc-500 dark:focus:border-[#838383]" 
                />
                <p className="text-[10px] text-zinc-500 dark:text-[#838383] mt-2">
                  Use commas and dashes to extract specific pages (e.g., 1, 3, 5-10, 15).
                </p>
              </div>
            </div>

            <button 
              onClick={executeSplit}
              disabled={!splitFile || !splitRange || isProcessing}
              className={`w-full mt-6 py-2 rounded-md text-sm font-medium transition-none flex items-center justify-center ${
                !splitFile || !splitRange || isProcessing
                  ? 'bg-zinc-100 dark:bg-[#262626] text-zinc-500 dark:text-[#838383] cursor-not-allowed'
                  : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0e0e0e] active:scale-[0.98]'
              }`}
            >
              <Download size={16} className="mr-2" /> 
              {isProcessing ? 'Processing...' : 'Extract Pages'}
            </button>
          </div>
        </div>
      )}

      {/* TO IMAGE UI */}
      {activeTool === 'to-image' && (
        <div className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-md overflow-hidden flex flex-col md:flex-row min-h-[400px]">
          <div className="flex-1 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-[#262626] flex flex-col relative overflow-hidden bg-zinc-100 dark:bg-[#090909]">
            {splitFile ? (
              <div className="relative w-full h-full flex-1 min-h-[350px]">
                <embed 
                  src={`${URL.createObjectURL(splitFile)}#toolbar=0&navpanes=0&scrollbar=0`} 
                  type="application/pdf" 
                  className="w-full h-full"
                />
                <button 
                  onClick={() => setSplitFile(null)}
                  className="absolute top-4 right-4 z-50 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-none"
                  title="Remove PDF"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label 
                onDrop={handleSplitDrop}
                onDragOver={handleDragOver}
                className="flex-1 m-8 border border-dashed border-zinc-300 dark:border-[#404040] hover:border-zinc-400 dark:hover:border-[#838383] bg-zinc-50 hover:bg-zinc-100 dark:bg-[#0e0e0e] dark:hover:bg-[#1a1a1a] rounded-md flex flex-col items-center justify-center p-6 cursor-pointer transition-none"
              >
                <FileText size={32} strokeWidth={1.5} className="text-zinc-500 dark:text-[#838383] mb-4" />
                <span className="text-sm font-medium text-zinc-900 dark:text-[#ededed] mb-1 text-center">
                  Drag PDF here
                </span>
                <span className="text-xs text-zinc-500 dark:text-[#838383] text-center">
                  Only .pdf files supported
                </span>
                <input type="file" accept="application/pdf" className="hidden" onChange={handleSplitFile} />
              </label>
            )}
          </div>

          <div className="w-full md:w-72 bg-white dark:bg-[#141414] p-6 flex flex-col">
            <div className="flex items-center text-xs font-semibold text-zinc-500 dark:text-[#838383] uppercase tracking-wider mb-6">
              <Settings2 size={14} className="mr-2" /> Parameters
            </div>

            <div className="space-y-5 flex-1">
              <div>
                <p className="text-xs text-zinc-500 dark:text-[#838383]">
                  All pages will be rendered as high-quality PNG images and saved to a directory of your choice.
                </p>
              </div>
            </div>

            <button 
              onClick={executePdfToImage}
              disabled={!splitFile || isProcessing}
              className={`w-full mt-6 py-2 rounded-md text-sm font-medium transition-none flex items-center justify-center ${
                !splitFile || isProcessing
                  ? 'bg-zinc-100 dark:bg-[#262626] text-zinc-500 dark:text-[#838383] cursor-not-allowed'
                  : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0e0e0e] active:scale-[0.98]'
              }`}
            >
              <ImageIcon size={16} className="mr-2" /> 
              {isProcessing ? 'Converting...' : 'Convert to PNG'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
