import { useState, useRef } from 'react';
import { Download, Settings2, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

export default function QrStudio() {
  const [value, setValue] = useState('https://github.com');
  const [size, setSize] = useState(256);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [level, setLevel] = useState<'L' | 'M' | 'Q' | 'H'>('H');
  
  const qrRef = useRef<HTMLDivElement>(null);

  const downloadQR = async (format: 'png' | 'svg') => {
    if (!qrRef.current) return;
    
    if (format === 'svg') {
      const svg = qrRef.current.querySelector('svg');
      if (!svg) return;
      
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const buffer = await blob.arrayBuffer();
      
      if (window.electronAPI && window.electronAPI.saveBuffer) {
        const result = await window.electronAPI.saveBuffer(buffer, `QR_Code.${format}`);
        if (result.success) toast.success('QR Code exported successfully!');
        else if (result.error !== 'Canceled by user') toast.error(result.error);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `QR_Code.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } else {
      const svg = qrRef.current.querySelector('svg');
      if (!svg) return;
      
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = async () => {
        canvas.width = size;
        canvas.height = size;
        if (ctx) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob(async (blob) => {
            if (!blob) return;
            const buffer = await blob.arrayBuffer();
            
            if (window.electronAPI && window.electronAPI.saveBuffer) {
              const result = await window.electronAPI.saveBuffer(buffer, `QR_Code.${format}`);
              if (result.success) toast.success('QR Code exported successfully!');
              else if (result.error !== 'Canceled by user') toast.error(result.error);
            } else {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `QR_Code.${format}`;
              a.click();
              URL.revokeObjectURL(url);
            }
          }, 'image/png');
        }
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-8">
        <h2 className="text-2xl font-medium text-zinc-900 dark:text-[#ededed]">QR Studio</h2>
        <p className="text-sm text-zinc-500 dark:text-[#a3a3a3] mt-1">Generate high-quality QR codes for links, text, or contacts.</p>
      </div>

      <div className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-md overflow-hidden flex flex-col md:flex-row flex-1 min-h-[400px]">
        {/* Left Panel - Preview */}
        <div className="flex-1 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-[#262626] flex flex-col relative overflow-hidden bg-zinc-100 dark:bg-[#090909] items-center justify-center p-8">
          
          <div 
            ref={qrRef}
            className="p-8 bg-white shadow-sm border border-zinc-200 rounded-xl transition-all duration-300"
            style={{ backgroundColor: bgColor }}
          >
            <QRCodeSVG 
              value={value || ' '} 
              size={Math.min(size, 300)} 
              fgColor={fgColor} 
              bgColor={bgColor} 
              level={level}
              includeMargin={false}
            />
          </div>
          
        </div>

        {/* Right Panel - Settings */}
        <div className="w-full md:w-80 bg-white dark:bg-[#141414] p-6 flex flex-col relative z-20">
          <div className="flex items-center text-xs font-semibold text-zinc-500 dark:text-[#737373] uppercase tracking-wider mb-6">
            <Settings2 size={14} className="mr-2" /> Properties
          </div>

          <div className="space-y-5 flex-1 overflow-y-auto custom-scrollbar pr-2">
            <div>
              <label className="block text-xs text-zinc-500 dark:text-[#a3a3a3] mb-1.5 flex items-center">
                <LinkIcon size={12} className="mr-1" /> Content URL or Text
              </label>
              <textarea 
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter URL or text..." 
                rows={3}
                className="w-full bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-300 dark:border-[#404040] rounded text-sm px-3 py-2 text-zinc-900 dark:text-[#ededed] focus:outline-none focus:border-zinc-500 dark:focus:border-[#737373] resize-none" 
              />
            </div>
            
            <div>
              <label className="block text-xs text-zinc-500 dark:text-[#a3a3a3] mb-1.5">Size (px)</label>
              <input 
                type="number" 
                value={size}
                min={100}
                max={2000}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-full bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-300 dark:border-[#404040] rounded text-sm px-3 py-2 text-zinc-900 dark:text-[#ededed] focus:outline-none focus:border-zinc-500 dark:focus:border-[#737373]" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 dark:text-[#a3a3a3] mb-1.5">Color</label>
                <div className="flex items-center border border-zinc-300 dark:border-[#404040] rounded bg-zinc-50 dark:bg-[#0e0e0e] p-1">
                  <input 
                    type="color" 
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent p-0" 
                  />
                  <span className="text-xs ml-2 text-zinc-700 dark:text-[#a3a3a3] uppercase">{fgColor}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 dark:text-[#a3a3a3] mb-1.5">Background</label>
                <div className="flex items-center border border-zinc-300 dark:border-[#404040] rounded bg-zinc-50 dark:bg-[#0e0e0e] p-1">
                  <input 
                    type="color" 
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent p-0" 
                  />
                  <span className="text-xs ml-2 text-zinc-700 dark:text-[#a3a3a3] uppercase">{bgColor}</span>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-zinc-500 dark:text-[#a3a3a3] mb-1.5">Error Correction</label>
              <select 
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="w-full bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-300 dark:border-[#404040] rounded text-sm px-3 py-2 text-zinc-900 dark:text-[#ededed] focus:outline-none focus:border-zinc-500 dark:focus:border-[#737373] appearance-none"
              >
                <option value="L">Low (~7% recovery)</option>
                <option value="M">Medium (~15% recovery)</option>
                <option value="Q">Quartile (~25% recovery)</option>
                <option value="H">High (~30% recovery)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => downloadQR('png')}
              className="flex-1 py-2 rounded-md text-sm font-medium transition-none flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0e0e0e]"
            >
              <ImageIcon size={14} className="mr-2" /> PNG
            </button>
            <button 
              onClick={() => downloadQR('svg')}
              className="flex-1 py-2 rounded-md text-sm font-medium transition-none flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 dark:bg-[#262626] dark:hover:bg-[#333] text-zinc-900 dark:text-[#ededed] border border-zinc-200 dark:border-[#404040]"
            >
              <Download size={14} className="mr-2" /> SVG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
