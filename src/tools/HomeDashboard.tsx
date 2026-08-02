import { useState } from 'react';
import { 
  FileAudio, Image as ImageIcon, Files, ScanText, ListTodo, KeyRound,
  QrCode, ArrowRightLeft, Timer, Mic
} from 'lucide-react';

interface HomeDashboardProps { onSelectTool: (toolId: string) => void; }
type Category = 'All' | 'Media' | 'Productivity' | 'Security' | 'Utilities';

export default function HomeDashboard({ onSelectTool }: HomeDashboardProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const categories: Category[] = ['All', 'Media', 'Productivity', 'Security', 'Utilities'];

  const tools = [
    { id: 'video-converter', name: 'Video to Audio', icon: FileAudio, desc: 'Extract audio tracks from video files locally.', category: 'Media' },
    { id: 'image-resizer', name: 'Image Resizer', icon: ImageIcon, desc: 'Resize and convert image formats instantly.', category: 'Media' },
    { id: 'vector-tracer', name: 'Vector Tracer', icon: ImageIcon, desc: 'Convert raster images (PNG, JPG) to scalable SVG vectors.', category: 'Media' },
    { id: 'pdf-tools', name: 'PDF Tools', icon: Files, desc: 'Locally manipulate PDF documents securely.', category: 'Productivity' },
    { id: 'ocr-tool', name: 'Screenshot & OCR', icon: ScanText, desc: 'Extract text from your screen locally via WebAssembly.', category: 'Productivity' },
    { id: 'qr-studio', name: 'QR Studio', icon: QrCode, desc: 'Generate high-quality custom QR codes for links, text, and contacts.', category: 'Utilities' },
    { id: 'todo-list', name: 'Task Manager', icon: ListTodo, desc: 'Organize your daily utility workflows.', category: 'Productivity' },
    { id: 'password-gen', name: 'Password Gen', icon: KeyRound, desc: 'Generate cryptographically secure random passwords.', category: 'Security' },
  ];

  const comingSoonTools = [
    { name: 'Smart Unit Converter', icon: ArrowRightLeft, desc: 'Instantly convert currency, length, weight, and temperatures.', category: 'Utilities' },
    { name: 'Focus Timer', icon: Timer, desc: 'Pomodoro timer to boost your daily productivity.', category: 'Productivity' },
    { name: 'Voice Memo Recorder', icon: Mic, desc: 'Quickly record and save high-quality audio notes locally.', category: 'Media' }
  ];

  const filteredTools = tools.filter(t => activeCategory === 'All' || t.category === activeCategory);
  const filteredComingSoon = comingSoonTools.filter(t => activeCategory === 'All' || t.category === activeCategory);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-medium text-zinc-900 dark:text-[#ededed]">Jontro Workspace</h2>
          <p className="text-sm text-zinc-500 dark:text-[#a3a3a3] mt-1">Select an everyday utility tool below to begin your workflow.</p>
        </div>
        
        <div className="flex items-center gap-1 bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] p-1 rounded-md overflow-x-auto custom-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-all duration-200 whitespace-nowrap active:scale-95 ${
                activeCategory === cat 
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-[#262626] dark:text-[#ededed]' 
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 dark:text-[#737373] dark:hover:text-[#ededed] dark:hover:bg-[#1f1f1f]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
        {filteredTools.map(tool => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] hover:border-zinc-400 dark:hover:border-[#737373] hover:bg-zinc-50 dark:hover:bg-[#1a1a1a] rounded-md p-6 flex flex-col text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-md group h-full"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-200 dark:border-[#262626] rounded-md flex items-center justify-center group-hover:border-zinc-300 dark:group-hover:border-[#404040]">
                  <Icon size={18} className="text-zinc-500 dark:text-[#a3a3a3] group-hover:text-zinc-900 dark:group-hover:text-[#ededed]" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] text-zinc-500 dark:text-[#555] font-medium uppercase tracking-wider">{tool.category}</span>
              </div>
              <h3 className="text-sm font-medium text-zinc-900 dark:text-[#ededed] mb-1.5">{tool.name}</h3>
              <p className="text-xs text-zinc-500 dark:text-[#737373] leading-relaxed line-clamp-2">{tool.desc}</p>
            </button>
          )
        })}
        
        {filteredComingSoon.map((tool, idx) => {
          const Icon = tool.icon;
          return (
            <div key={`soon-${idx}`} className="bg-zinc-50 dark:bg-[#0e0e0e] border border-dashed border-zinc-300 dark:border-[#262626] hover:border-zinc-400 dark:hover:border-[#404040] transition-colors duration-300 rounded-md p-6 flex flex-col text-left opacity-70 h-full relative overflow-hidden group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-md flex items-center justify-center">
                  <Icon size={16} className="text-zinc-500 dark:text-[#555]" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] text-zinc-500 dark:text-[#555] font-medium uppercase tracking-wider">{tool.category}</span>
              </div>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-200 dark:bg-[#262626] text-zinc-600 dark:text-[#a3a3a3] text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                Coming Soon
              </div>
              <h3 className="text-sm font-medium text-zinc-500 dark:text-[#a3a3a3] mb-1.5">{tool.name}</h3>
              <p className="text-xs text-zinc-500 dark:text-[#555] leading-relaxed line-clamp-2">{tool.desc}</p>
            </div>
          )
        })}
      </div>
    </div>
  );
}
