import { useState, useEffect } from 'react';
import {
  FileAudio, Image as ImageIcon, Files, ScanText, ListTodo, KeyRound,
  ChevronRight, LayoutDashboard, Sun, Moon, Search, Cpu, Activity,
  PenTool, QrCode, Crown, Lock
} from 'lucide-react';
import VideoConverter from './tools/VideoConverter';
import TodoList from './tools/TodoList';
import PasswordGen from './tools/PasswordGen';
import ImageResizer from './tools/ImageResizer';
import PdfTools from './tools/PdfTools';
import OcrTool from './tools/OcrTool';
import QrStudio from './tools/QrStudio';
import HomeDashboard from './tools/HomeDashboard';
import VectorTracer from './tools/VectorTracer';
import LicenseActivation from './tools/LicenseActivation';
import ErrorBoundary from './components/ErrorBoundary';
import PremiumGate from './lib/license/PremiumGate';
import { useLicense } from './lib/license/useLicense';
import { Toaster, toast } from 'sonner';
import pkg from '../package.json';

function App() {
  const { isPremium } = useLicense();
  const [activeTab, setActiveTab] = useState('home');
  const [isBooting, setIsBooting] = useState(true);
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  const [telemetry, setTelemetry] = useState({ cpu: '0', ram: '0', ramTotal: '0' });
  const [showPalette, setShowPalette] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('jontro-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const logs = [
      "Initializing core modules...",
      "Mounting native OS bindings...",
      "Verifying cryptography hashes...",
      "Loading hardware acceleration...",
      "Waking WebAssembly engines...",
      "System ready."
    ];
    let i = 0;
    const interval = setInterval(() => {
      setBootLogs(prev => {
        const next = [...prev, logs[i]];
        return next.length > 4 ? next.slice(next.length - 4) : next;
      });
      i++;
      if (i >= logs.length) {
        clearInterval(interval);
        setTimeout(() => setIsBooting(false), 500);
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('jontro-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('jontro-theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onSystemTelemetry) {
      window.electronAPI.onSystemTelemetry((data) => setTelemetry(data));
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowPalette(p => !p);
      }
      if (e.key === 'Escape') setShowPalette(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onUpdateAvailable) {
      window.electronAPI.onUpdateAvailable((version) => {
        toast.info(`Version ${version} is downloading...`, {
          description: "Jontro is automatically fetching the latest update in the background.",
          duration: 10000,
        });
      });

      window.electronAPI.onUpdateDownloaded(() => {
        toast.success("Update Ready to Install!", {
          description: "The new version has been downloaded successfully.",
          duration: Infinity,
          action: {
            label: "Restart App",
            onClick: () => window.electronAPI!.installUpdate()
          }
        });
      });
    }
  }, []);

  const tools = [
    { id: 'video-converter', name: 'Video to Audio', icon: FileAudio, premium: true },
    { id: 'image-resizer', name: 'Image Resizer', icon: ImageIcon, premium: true },
    { id: 'vector-tracer', name: 'Vector Tracer', icon: PenTool, premium: true },
    { id: 'pdf-tools', name: 'PDF Tools', icon: Files, premium: true },
    { id: 'ocr-tool', name: 'Screenshot & OCR', icon: ScanText, premium: true },
    { id: 'qr-studio', name: 'QR Studio', icon: QrCode, premium: false },
    { id: 'todo-list', name: 'To-Do List', icon: ListTodo, premium: false },
    { id: 'password-gen', name: 'Password Gen', icon: KeyRound, premium: false },
  ];

  if (isBooting) {
    return (
      <div className="flex h-screen bg-zinc-100 dark:bg-[#0e0e0e] items-center justify-center flex-col">
        <div className="w-20 h-20 bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-2xl flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden group">
          <span className="text-zinc-900 dark:text-[#ededed] font-bold text-4xl font-sans tracking-tighter">J</span>
          <div className="absolute inset-0 border-2 border-transparent border-t-blue-500 rounded-2xl animate-[spin_2s_linear_infinite] opacity-50"></div>
        </div>
        <h1 className="text-sm font-semibold text-zinc-900 dark:text-[#ededed] tracking-[0.2em] mb-4">JONTRO</h1>
        
        <div className="w-64 h-24 bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-md p-3 flex flex-col justify-end overflow-hidden shadow-inner">
          {bootLogs.map((log, i) => (
            <div key={i} className="text-[10px] font-mono text-zinc-500 dark:text-[#838383] animate-in slide-in-from-bottom-2 fade-in duration-200 leading-tight">
              &gt; {log}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-100 dark:bg-[#0e0e0e] text-zinc-900 dark:text-[#ededed] font-sans selection:bg-blue-500/30">
      <Toaster 
        theme={isDark ? 'dark' : 'light'} 
        position="bottom-right" 
        toastOptions={{ className: 'font-sans' }} 
      />
      
      {/* Sidebar */}
      <div className="w-16 md:w-64 bg-white dark:bg-[#141414] border-r border-zinc-200 dark:border-[#262626] flex flex-col z-10 shrink-0 transition-all duration-300 ease-in-out">
        {/* App Header */}
        <div className="h-14 flex items-center justify-center md:justify-between px-0 md:px-5 border-b border-zinc-200 dark:border-[#262626]">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-zinc-900 dark:bg-[#ededed] rounded flex items-center justify-center md:mr-3 shrink-0">
              <span className="text-white dark:text-[#0e0e0e] font-bold text-xs font-sans tracking-tighter">J</span>
            </div>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-[#ededed] tracking-wide hidden md:block">JONTRO</h1>
          </div>
          <button
            onClick={() => setIsDark(!isDark)}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="hidden md:flex p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-[#838383] dark:hover:text-[#ededed] hover:bg-zinc-100 dark:hover:bg-[#262626] transition-none active:scale-95"
          >
            {isDark ? <Sun size={14} className="animate-in fade-in spin-in-12" /> : <Moon size={14} className="animate-in fade-in spin-in-12" />}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          <div className="px-5 mb-3 hidden md:block">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-[#838383] uppercase tracking-widest">Workspace</span>
          </div>

          <div className="space-y-0.5 px-2 md:px-3">
            <button
              onClick={() => setActiveTab('home')}
              title="Dashboard"
              aria-label="Dashboard"
              className={`w-full flex items-center justify-center md:justify-start px-3 py-3 md:py-2 rounded-md text-sm transition-none mb-4 ${
                activeTab === 'home' 
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-[#262626] dark:text-[#ededed]' 
                  : 'hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 dark:hover:bg-[#1f1f1f] dark:text-[#a3a3a3] dark:hover:text-[#ededed]'
              }`}
            >
              <LayoutDashboard size={16} className={`md:mr-3 shrink-0 ${activeTab === 'home' ? 'text-zinc-900 dark:text-[#ededed]' : 'text-zinc-500 dark:text-[#838383]'}`} strokeWidth={activeTab === 'home' ? 2 : 1.5} />
              <span className={`hidden md:block ${activeTab === 'home' ? 'font-medium' : 'font-normal'}`}>Dashboard</span>
            </button>

            {tools.map(tool => {
              const Icon = tool.icon;
              const isActive = activeTab === tool.id;
              
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTab(tool.id)}
                  title={tool.name}
                  aria-label={tool.name}
                  className={`w-full flex items-center justify-center md:justify-start px-3 py-3 md:py-2 rounded-md text-sm transition-none ${
                    isActive 
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-[#262626] dark:text-[#ededed]' 
                      : 'hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 dark:hover:bg-[#1f1f1f] dark:text-[#a3a3a3] dark:hover:text-[#ededed]'
                  }`}
                >
                  <span className="relative md:mr-3 shrink-0">
                    <Icon size={16} className={isActive ? 'text-zinc-900 dark:text-[#ededed]' : 'text-zinc-500 dark:text-[#838383]'} strokeWidth={isActive ? 2 : 1.5} />
                    {tool.premium && !isPremium && (
                      <Lock size={9} strokeWidth={2.5} className="md:hidden absolute -top-1.5 -right-1.5 bg-white dark:bg-[#141414] text-zinc-400 dark:text-[#555] rounded-full p-0.5 box-content" />
                    )}
                  </span>
                  <span className={`hidden md:block flex-1 text-left ${isActive ? 'font-medium' : 'font-normal'}`}>{tool.name}</span>
                  {tool.premium && !isPremium && (
                    <Lock size={11} className="hidden md:block text-zinc-400 dark:text-[#555] shrink-0" />
                  )}
                </button>
              )
            })}

            <button
              onClick={() => setActiveTab('license')}
              title="License"
              aria-label="License"
              className={`w-full flex items-center justify-center md:justify-start px-3 py-3 md:py-2 rounded-md text-sm transition-none mt-4 border ${
                activeTab === 'license'
                  ? 'bg-zinc-100 border-zinc-200 text-zinc-900 dark:bg-[#262626] dark:border-[#404040] dark:text-[#ededed]'
                  : 'border-dashed border-zinc-200 dark:border-[#262626] hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 dark:hover:bg-[#1f1f1f] dark:text-[#a3a3a3] dark:hover:text-[#ededed]'
              }`}
            >
              <Crown size={16} className={`md:mr-3 shrink-0 ${activeTab === 'license' ? 'text-zinc-900 dark:text-[#ededed]' : 'text-blue-500'}`} strokeWidth={1.5} />
              <span className={`hidden md:block ${activeTab === 'license' ? 'font-medium' : 'font-normal'}`}>{isPremium ? 'License' : 'Upgrade'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-[#262626] flex flex-col gap-2 text-xs text-zinc-500 dark:text-[#838383]">
          <div className="hidden md:flex items-center justify-between">
            <span className="font-semibold text-zinc-900 dark:text-[#a3a3a3]">v{pkg.version}</span>
            <div className="flex items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 animate-pulse"></div>
              <span>Online</span>
            </div>
          </div>
          
          <div className="hidden md:flex flex-col gap-1 mt-2 p-2 bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-200 dark:border-[#262626] rounded">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Cpu size={10} /> CPU</span>
              <span className="font-mono text-[10px] text-zinc-900 dark:text-[#ededed]">{telemetry.cpu}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Activity size={10} /> RAM</span>
              <span className="font-mono text-[10px] text-zinc-900 dark:text-[#ededed]">{telemetry.ram} GB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-[#0e0e0e]">
        {/* Header Breadcrumbs */}
        <div className="h-14 border-b border-zinc-200 dark:border-[#262626] flex items-center justify-between px-8 bg-zinc-50 dark:bg-[#0e0e0e]">
          <div className="flex items-center text-xs text-zinc-500 dark:text-[#838383]">
            <span>Workspace</span>
            <ChevronRight size={12} className="mx-2" />
            <span className="text-zinc-900 dark:text-[#ededed]">
              {activeTab === 'home' ? 'Dashboard' : activeTab === 'license' ? 'License' : tools.find(t => t.id === activeTab)?.name}
            </span>
          </div>
          <button
            onClick={() => setIsDark(!isDark)}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="md:hidden flex p-2 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-[#838383] dark:hover:text-[#ededed] bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] transition-none active:scale-95"
          >
            {isDark ? <Sun size={14} className="animate-in fade-in spin-in-12" /> : <Moon size={14} className="animate-in fade-in spin-in-12" />}
          </button>
        </div>
        
        {/* Workspace */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto h-full">
            <ErrorBoundary key={activeTab}>
              {activeTab === 'home' && <HomeDashboard onSelectTool={setActiveTab} />}
              {activeTab === 'license' && <LicenseActivation />}
              {activeTab === 'todo-list' && <TodoList />}
              {activeTab === 'password-gen' && <PasswordGen />}
              {activeTab === 'qr-studio' && <QrStudio />}
              {activeTab === 'video-converter' && (
                <PremiumGate toolName="Video to Audio" onActivate={() => setActiveTab('license')}><VideoConverter /></PremiumGate>
              )}
              {activeTab === 'image-resizer' && (
                <PremiumGate toolName="Image Resizer" onActivate={() => setActiveTab('license')}><ImageResizer /></PremiumGate>
              )}
              {activeTab === 'vector-tracer' && (
                <PremiumGate toolName="Vector Tracer" onActivate={() => setActiveTab('license')}><VectorTracer /></PremiumGate>
              )}
              {activeTab === 'pdf-tools' && (
                <PremiumGate toolName="PDF Tools" onActivate={() => setActiveTab('license')}><PdfTools /></PremiumGate>
              )}
              {activeTab === 'ocr-tool' && (
                <PremiumGate toolName="Screenshot & OCR" onActivate={() => setActiveTab('license')}><OcrTool /></PremiumGate>
              )}
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* Command Palette Overlay */}
      {showPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-zinc-900/50 dark:bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => { if (e.target === e.currentTarget) setShowPalette(false); }}>
          <div className="w-full max-w-lg bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex items-center px-4 py-3 border-b border-zinc-200 dark:border-[#262626]">
              <Search size={18} className="text-zinc-400 dark:text-[#838383] mr-3" />
              <input 
                autoFocus
                type="text" 
                placeholder="Search tools... (e.g., ocr, video)"
                value={paletteQuery}
                onChange={e => setPaletteQuery(e.target.value)}
                className="flex-1 bg-transparent border-none text-zinc-900 dark:text-[#ededed] text-sm focus:outline-none placeholder-zinc-400 dark:placeholder-[#838383]"
              />
              <div className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-[#262626] text-[10px] text-zinc-500 dark:text-[#a3a3a3] font-medium border border-zinc-200 dark:border-[#404040]">ESC</div>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
              {[{ id: 'home', name: 'Home Dashboard', icon: LayoutDashboard }, ...tools, { id: 'license', name: isPremium ? 'License' : 'Upgrade', icon: Crown }]
                .filter(t => t.name.toLowerCase().includes(paletteQuery.toLowerCase()))
                .map(tool => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => { setActiveTab(tool.id); setShowPalette(false); setPaletteQuery(''); }}
                      className="w-full flex items-center px-3 py-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-[#262626] group transition-none text-left active:scale-[0.98]"
                    >
                      <div className="w-8 h-8 rounded-md bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-200 dark:border-[#262626] flex items-center justify-center mr-3 group-hover:border-zinc-300 dark:group-hover:border-[#404040] transition-colors">
                        <Icon size={14} className="text-zinc-500 dark:text-[#838383] group-hover:text-zinc-900 dark:group-hover:text-[#ededed]" />
                      </div>
                      <span className="text-sm font-medium text-zinc-700 dark:text-[#a3a3a3] group-hover:text-zinc-900 dark:group-hover:text-[#ededed] transition-colors">{tool.name}</span>
                    </button>
                  )
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
