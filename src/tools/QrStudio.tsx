import { useState, useRef } from 'react';
import { Download, Settings2, Link as LinkIcon, Image as ImageIcon, UploadCloud, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

export default function QrStudio() {
  const [value, setValue] = useState('https://github.com');
  const [size, setSize] = useState(256);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [level, setLevel] = useState<'L' | 'M' | 'Q' | 'H'>('H');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(20);
  const [excavate, setExcavate] = useState(true);
  
  const qrRef = useRef<HTMLDivElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Use a base64 data: URI rather than a blob: URL. blob: URLs are scoped
      // to this session - if embedded in an exported .svg's <image> href,
      // the logo becomes a broken reference the moment the file is opened
      // outside the app (blob URLs die with the page). A data: URI is
      // self-contained and survives being saved to disk.
      const reader = new FileReader();
      reader.onload = () => setLogoUrl(reader.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const removeLogo = () => {
    setLogoUrl(null);
  };

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
            className="p-8 bg-white shadow-sm border border-zinc-200 rounded-xl transition-none"
            style={{ backgroundColor: bgColor }}
          >
            <QRCodeSVG 
              value={value || ' '} 
              size={Math.min(size, 300)} 
              fgColor={fgColor} 
              bgColor={bgColor} 
              level={level}
              includeMargin={false}
              imageSettings={logoUrl ? {
                src: logoUrl,
                height: (Math.min(size, 300) * logoSize) / 100,
                width: (Math.min(size, 300) * logoSize) / 100,
                excavate: excavate,
              } : undefined}
            />
          </div>
          
        </div>

        {/* Right Panel - Settings */}
        <div className="w-full md:w-80 bg-white dark:bg-[#141414] p-6 flex flex-col relative z-20">
          <div className="flex items-center text-xs font-semibold text-zinc-500 dark:text-[#838383] uppercase tracking-wider mb-6">
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
                className="w-full bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-300 dark:border-[#404040] rounded text-sm px-3 py-2 text-zinc-900 dark:text-[#ededed] focus:outline-none focus:border-zinc-500 dark:focus:border-[#838383] resize-none" 
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
                className="w-full bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-300 dark:border-[#404040] rounded text-sm px-3 py-2 text-zinc-900 dark:text-[#ededed] focus:outline-none focus:border-zinc-500 dark:focus:border-[#838383]" 
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
                className="w-full bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-300 dark:border-[#404040] rounded text-sm px-3 py-2 text-zinc-900 dark:text-[#ededed] focus:outline-none focus:border-zinc-500 dark:focus:border-[#838383] appearance-none"
              >
                <option value="L">Low (~7% recovery)</option>
                <option value="M">Medium (~15% recovery)</option>
                <option value="Q">Quartile (~25% recovery)</option>
                <option value="H">High (~30% recovery)</option>
              </select>
            </div>
            
            <div className="pt-4 border-t border-zinc-200 dark:border-[#262626]">
              <label className="block text-xs font-semibold text-zinc-900 dark:text-[#ededed] mb-3">Custom Logo</label>
              
              {!logoUrl ? (
                <label className="border border-dashed border-zinc-300 dark:border-[#404040] hover:border-zinc-400 dark:hover:border-[#838383] bg-zinc-50 dark:bg-[#0e0e0e] rounded-md flex flex-col items-center justify-center p-4 cursor-pointer transition-none">
                  <UploadCloud size={16} className="text-zinc-500 dark:text-[#838383] mb-2" />
                  <span className="text-xs font-medium text-zinc-900 dark:text-[#ededed]">Upload Logo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-200 dark:border-[#262626] p-2 rounded-md">
                    <div className="flex items-center">
                      <img src={logoUrl} alt="Logo" className="w-6 h-6 object-contain mr-3 bg-white rounded-sm p-0.5" />
                      <span className="text-xs text-zinc-700 dark:text-[#a3a3a3]">Logo Applied</span>
                    </div>
                    <button onClick={removeLogo} className="text-red-500 hover:text-red-600 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs text-zinc-500 dark:text-[#a3a3a3]">Logo Size</label>
                      <span className="text-xs text-zinc-900 dark:text-[#ededed]">{logoSize}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="30" 
                      value={logoSize} 
                      onChange={(e) => setLogoSize(Number(e.target.value))}
                      className="w-full accent-zinc-900 dark:accent-zinc-400" 
                    />
                  </div>
                  
                  <label className="flex items-center cursor-pointer group" onClick={() => setExcavate(!excavate)}>
                    <div className={`w-4 h-4 rounded-sm border mr-2 flex items-center justify-center transition-none ${
                      excavate 
                        ? 'bg-zinc-900 dark:bg-[#ededed] border-zinc-900 dark:border-[#ededed] text-white dark:text-zinc-900' 
                        : 'bg-zinc-50 dark:bg-[#0e0e0e] border-zinc-300 dark:border-[#404040]'
                    }`}>
                      {excavate && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </div>
                    <span className="text-xs text-zinc-700 dark:text-[#a3a3a3] group-hover:text-zinc-900 dark:group-hover:text-[#ededed]">
                      Clear background behind logo
                    </span>
                  </label>
                </div>
              )}
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
