import { useState, useEffect, useRef } from 'react';
import { Merge, SplitSquareHorizontal, FilePlus, X, ArrowLeft, Download, FileText, Settings2, Image as ImageIcon, ScanLine, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { PDFDocument } from 'pdf-lib';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
// Type-only import - erased at compile time, so this does NOT force scanic's
// JS into the main bundle. The actual module is loaded lazily (see
// ensureScanic) only when the user opens the Images-to-PDF mode, same
// pattern already used for pdfjs-dist/tesseract.js elsewhere in this app.
import type { CornerPoints } from 'scanic';

type ScanicModule = typeof import('scanic');

interface ScanPage {
  id: string;
  name: string;
  width: number;
  height: number;
  bytes: ArrayBuffer;
  thumbUrl: string;
}

// Classic Otsu's method: picks the grayscale threshold that best separates
// a bimodal histogram (dark text vs. light page) into two classes by
// maximizing between-class variance. This is the same automatic-threshold
// technique real scanner apps use for their "B&W" mode.
function otsuThreshold(histogram: number[], total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];
  let sumB = 0, wB = 0, varMax = 0, threshold = 127;
  for (let i = 0; i < 256; i++) {
    wB += histogram[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * histogram[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const varBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varBetween > varMax) { varMax = varBetween; threshold = i; }
  }
  return threshold;
}

function applyColorMode(canvas: HTMLCanvasElement, mode: 'original' | 'gray' | 'bw') {
  if (mode === 'original') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // Human-eye weighted luminance, matching the same formula ImageResizer
    // uses for its Grayscale filter, for a consistent look across the app.
    gray[p] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    if (mode === 'gray') {
      data[i] = data[i + 1] = data[i + 2] = gray[p];
    }
  }
  if (mode === 'bw') {
    const histogram = new Array(256).fill(0);
    for (let p = 0; p < gray.length; p++) histogram[gray[p]]++;
    const threshold = otsuThreshold(histogram, gray.length);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const v = gray[p] > threshold ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = v;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Failed to encode canvas')); return; }
      blob.arrayBuffer().then(resolve, reject);
    }, 'image/png');
  });
}

function makeThumbnail(canvas: HTMLCanvasElement, maxWidth = 240): string {
  const scale = Math.min(1, maxWidth / canvas.width);
  const thumb = document.createElement('canvas');
  thumb.width = Math.round(canvas.width * scale);
  thumb.height = Math.round(canvas.height * scale);
  thumb.getContext('2d')?.drawImage(canvas, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL('image/jpeg', 0.82);
}

// Below these, a "detected" quad is more likely noise than a real page -
// classical edge detection can report success:true with technically-valid
// corners on any photo (a face, a graphic design, anything with edges),
// not just documents. Calibrated against real test cases: a genuine
// photographed page scored confidence ~0.93 covering most of the frame,
// while a portrait and an abstract graphic both scored confidence ~0.17-0.21
// with the "page" being a sliver covering under 1.5% of the image.
const MIN_DETECTION_CONFIDENCE = 0.5;
const MIN_DETECTION_AREA_RATIO = 0.15;

function quadAreaRatio(corners: CornerPoints, width: number, height: number): number {
  const pts = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % 4];
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(area) / 2 / (width * height);
}

function fullBoundsCorners(width: number, height: number): CornerPoints {
  return {
    topLeft: { x: 0, y: 0 },
    topRight: { x: width, y: 0 },
    bottomRight: { x: width, y: height },
    bottomLeft: { x: 0, y: height },
  };
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Failed to load ${file.name}`)); };
    img.src = url;
  });
}

export default function PdfTools() {
  const [activeTool, setActiveTool] = useState<'none' | 'merge' | 'split' | 'to-image' | 'images-to-pdf'>('none');

  // Merge State
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);

  // Split / To-Image State
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [splitRange, setSplitRange] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);

  // Images-to-PDF (scan) State
  const [scanPages, setScanPages] = useState<ScanPage[]>([]);
  const [colorMode, setColorMode] = useState<'original' | 'gray' | 'bw'>('original');
  const [editorImage, setEditorImage] = useState<{ file: File; img: HTMLImageElement; corners?: CornerPoints; lowConfidence: boolean } | null>(null);
  const scanicRef = useRef<ScanicModule | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const pendingResolveRef = useRef<((corners: CornerPoints | null) => void) | null>(null);
  // Mirrors colorMode so a mode change made while the corner editor is still
  // open for a given image is honored - the confirm handler is set up once
  // when the editor mounts and would otherwise close over a stale value.
  const colorModeRef = useRef(colorMode);
  useEffect(() => { colorModeRef.current = colorMode; }, [colorMode]);

  const ensureScanic = async (): Promise<ScanicModule> => {
    if (!scanicRef.current) {
      scanicRef.current = await import('scanic');
    }
    return scanicRef.current;
  };

  // Mounts scanic's interactive corner-editor whenever a new image is ready
  // for review, and tears it down on the way out - the editor is an
  // imperative DOM widget (not a React component), so its lifecycle is
  // managed here rather than in JSX.
  useEffect(() => {
    if (!editorImage || !editorContainerRef.current || !scanicRef.current) return;
    const editor = scanicRef.current.createCornerEditor({
      container: editorContainerRef.current,
      image: editorImage.img,
      corners: editorImage.corners,
      magnifier: { enabled: true },
      onConfirm: (corners) => pendingResolveRef.current?.(corners),
      onCancel: () => pendingResolveRef.current?.(null),
    });
    return () => editor.destroy();
  }, [editorImage]);

  const handleAddScanImages = async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      if (files.length > 0) toast.error('Please select valid image files.');
      return;
    }

    const scanic = await ensureScanic();

    for (const file of imageFiles) {
      let img: HTMLImageElement;
      try {
        img = await loadImageFromFile(file);
      } catch {
        toast.error(`Could not read ${file.name}.`);
        continue;
      }

      // Auto-detect the page's corners (Canny edge detection -> largest
      // quadrilateral contour). Classical edge detection can report
      // success:true on ANY photo with edges - a face, a graphic design,
      // not just documents - so a "successful" detection isn't trusted on
      // its own. Require both a confident score AND a plausible page size
      // (a real photographed page fills most of the frame; a false-positive
      // detection tends to be a tiny sliver). Calibrated against real
      // photos: a genuine document scored confidence ~0.93 covering most of
      // the frame, while a portrait and an abstract graphic both scored
      // ~0.17-0.21 with "pages" covering under 1.5% of the image.
      let detected: CornerPoints | undefined;
      let lowConfidence = false;
      try {
        const detectResult = await scanic.scanDocument(img, { mode: 'detect' });
        const confident = detectResult.success
          && detectResult.corners
          && (detectResult.confidence ?? 1) >= MIN_DETECTION_CONFIDENCE
          && quadAreaRatio(detectResult.corners, img.width, img.height) >= MIN_DETECTION_AREA_RATIO;
        if (confident) {
          detected = detectResult.corners!;
        } else {
          lowConfidence = true;
        }
      } catch {
        lowConfidence = true;
      }

      setEditorImage({ file, img, corners: detected ?? fullBoundsCorners(img.width, img.height), lowConfidence });
      const corners = await new Promise<CornerPoints | null>((resolve) => {
        pendingResolveRef.current = resolve;
      });
      setEditorImage(null);
      pendingResolveRef.current = null;

      if (!corners) continue; // user canceled this page - move on to the next file

      try {
        const extracted = await scanic.extractDocument(img, corners, { output: 'canvas' });
        const canvas = extracted.output as HTMLCanvasElement;
        applyColorMode(canvas, colorModeRef.current);
        const bytes = await canvasToPngBytes(canvas);
        setScanPages((prev) => [...prev, {
          id: crypto.randomUUID(),
          name: file.name,
          width: canvas.width,
          height: canvas.height,
          bytes,
          thumbUrl: makeThumbnail(canvas),
        }]);
      } catch {
        toast.error(`Failed to process ${file.name}.`);
      }
    }
  };

  const removeScanPage = (id: string) => {
    setScanPages((prev) => prev.filter((p) => p.id !== id));
  };

  const executeImagesToPdf = async () => {
    if (scanPages.length === 0) return;
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();
      // 150 DPI: a good quality/size balance for a scanned page, matching
      // what most scanning apps default to for text documents.
      const DPI = 150;
      for (const scanPage of scanPages) {
        const pngImage = await pdfDoc.embedPng(scanPage.bytes);
        const pageWidth = (scanPage.width * 72) / DPI;
        const pageHeight = (scanPage.height * 72) / DPI;
        const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);
        pdfPage.drawImage(pngImage, { x: 0, y: 0, width: pageWidth, height: pageHeight });
      }
      const pdfBytes = await pdfDoc.save();

      if (window.electronAPI && window.electronAPI.saveBuffer) {
        const result = await window.electronAPI.saveBuffer(pdfBytes.buffer as ArrayBuffer, 'Scanned_Document.pdf');
        if (result.success) {
          toast.success('Scanned PDF created successfully!');
          setScanPages([]);
        } else if (result.error !== 'Canceled by user') {
          toast.error(result.error);
        }
      } else {
        toast.error('Native file saving not available in browser sandbox.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error creating PDF from scanned images.');
    } finally {
      setIsProcessing(false);
    }
  };

  // A single stable blob URL per selected file, revoked whenever it's
  // replaced/cleared or the component unmounts - the previous code minted a
  // fresh (and never-revoked) blob URL on every render via inline
  // URL.createObjectURL(splitFile) in the JSX, leaking memory on each
  // keystroke in the "Pages to Extract" field.
  const [splitFileUrl, setSplitFileUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!splitFile) {
      setSplitFileUrl(null);
      return;
    }
    const url = URL.createObjectURL(splitFile);
    setSplitFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [splitFile]);

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
            PDF Tools {activeTool === 'merge' && '- Merge'} {activeTool === 'split' && '- Split'} {activeTool === 'to-image' && '- To Images'} {activeTool === 'images-to-pdf' && '- Scan to PDF'}
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

          <div
            onClick={() => setActiveTool('images-to-pdf')}
            className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] hover:border-zinc-400 dark:hover:border-[#404040] rounded-md p-6 cursor-pointer group transition-none"
          >
            <div className="w-10 h-10 bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-200 dark:border-[#262626] rounded-md flex items-center justify-center mb-4 transition-none">
              <ScanLine size={18} className="text-zinc-500 dark:text-[#a3a3a3] group-hover:text-zinc-900 dark:group-hover:text-[#ededed] transition-colors" />
            </div>
            <h3 className="text-base font-medium text-zinc-900 dark:text-[#ededed] mb-1">Images to PDF (Scan)</h3>
            <p className="text-xs text-zinc-500 dark:text-[#838383] leading-relaxed">Auto-detect page edges, correct perspective, and combine photos into a scanned PDF.</p>
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
                  src={`${splitFileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
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
                  src={`${splitFileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
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

      {/* IMAGES TO PDF (SCAN) UI */}
      {activeTool === 'images-to-pdf' && (
        <div className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-md overflow-hidden flex flex-col md:flex-row min-h-[400px]">
          <div className="flex-1 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-[#262626] flex flex-col p-6 bg-zinc-100 dark:bg-[#090909]">
            <label
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleAddScanImages(Array.from(e.dataTransfer.files)); }}
              onDragOver={handleDragOver}
              className="border border-dashed border-zinc-300 dark:border-[#404040] hover:border-zinc-400 dark:hover:border-[#838383] bg-zinc-50 hover:bg-zinc-100 dark:bg-[#0e0e0e] dark:hover:bg-[#1a1a1a] rounded-md flex flex-col items-center justify-center p-6 cursor-pointer transition-none mb-6"
            >
              <UploadCloud size={28} strokeWidth={1.5} className="text-zinc-500 dark:text-[#838383] mb-3" />
              <span className="text-sm font-medium text-zinc-900 dark:text-[#ededed] mb-1">
                Drag photos here or browse
              </span>
              <span className="text-xs text-zinc-500 dark:text-[#838383]">
                Each photo opens for corner adjustment before it's added
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files) handleAddScanImages(Array.from(e.target.files)); e.target.value = ''; }}
              />
            </label>

            {scanPages.length > 0 ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <h3 className="text-xs font-medium text-zinc-500 dark:text-[#838383] uppercase tracking-wider mb-3">
                  Pages ({scanPages.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {scanPages.map((page, idx) => (
                    <div key={page.id} className="relative group">
                      <div className="w-full aspect-[3/4] rounded-md border border-zinc-200 dark:border-[#262626] bg-white flex items-center justify-center overflow-hidden">
                        <img src={page.thumbUrl} alt={page.name} className="max-w-full max-h-full object-contain" />
                      </div>
                      <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">{idx + 1}</span>
                      <button
                        onClick={() => removeScanPage(page.id)}
                        className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-none"
                        title="Remove page"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-zinc-500 dark:text-[#838383]">
                No pages scanned yet.
              </div>
            )}
          </div>

          <div className="w-full md:w-72 bg-white dark:bg-[#141414] p-6 flex flex-col">
            <div className="flex items-center text-xs font-semibold text-zinc-500 dark:text-[#838383] uppercase tracking-wider mb-6">
              <Settings2 size={14} className="mr-2" /> Parameters
            </div>

            <div className="space-y-5 flex-1">
              <div>
                <label className="block text-xs text-zinc-500 dark:text-[#a3a3a3] mb-1.5">Color Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'original', label: 'Original' },
                    { id: 'gray', label: 'Gray' },
                    { id: 'bw', label: 'B&W' },
                  ] as const).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setColorMode(m.id)}
                      className={`py-1.5 rounded-md text-xs font-medium border transition-none ${
                        colorMode === m.id
                          ? 'bg-zinc-900 dark:bg-[#ededed] text-white dark:text-[#0e0e0e] border-zinc-900 dark:border-[#ededed]'
                          : 'bg-zinc-50 dark:bg-[#0e0e0e] text-zinc-700 dark:text-[#a3a3a3] border-zinc-300 dark:border-[#404040]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-[#838383] mt-2">
                  Applied to new pages as they're scanned. Existing pages keep the mode they were scanned with.
                </p>
              </div>
            </div>

            <button
              onClick={executeImagesToPdf}
              disabled={scanPages.length === 0 || isProcessing}
              className={`w-full mt-6 py-2 rounded-md text-sm font-medium transition-none flex items-center justify-center ${
                scanPages.length === 0 || isProcessing
                  ? 'bg-zinc-100 dark:bg-[#262626] text-zinc-500 dark:text-[#838383] cursor-not-allowed'
                  : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0e0e0e] active:scale-[0.98]'
              }`}
            >
              <Download size={16} className="mr-2" />
              {isProcessing ? 'Creating PDF...' : 'Create PDF'}
            </button>
          </div>
        </div>
      )}

      {/* Corner-adjustment overlay for the currently reviewed scan image */}
      {editorImage && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-[#141414] rounded-md p-4 flex flex-col items-center">
            {editorImage.lowConfidence ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 self-start max-w-[78vw]">
                We couldn't find a clear page in this photo, so the whole image is selected. If it's not a
                document (a portrait, a design, etc.), just click Apply to add it as-is - or drag the corners
                to crop it.
              </p>
            ) : (
              <p className="text-xs text-zinc-500 dark:text-[#838383] mb-3 self-start">
                Drag the corners to match the page edges, then Apply.
              </p>
            )}
            <div ref={editorContainerRef} style={{ width: '78vw', height: '68vh', maxWidth: '900px' }} />
          </div>
        </div>
      )}
    </div>
  );
}
