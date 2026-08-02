import { useState, useEffect } from 'react';
import { 
  FileAudio, Image as ImageIcon, Files, ScanText, ListTodo, KeyRound,
  ChevronRight, LayoutDashboard, Sun, Moon
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
import { Toaster, toast } from 'sonner';
import pkg from '../package.json';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isBooting, setIsBooting] = useState(true);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('jontro-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 800);
    return () => clearTimeout(timer);
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
    { id: 'video-converter', name: 'Video to Audio', icon: FileAudio },
    { id: 'image-resizer', name: 'Image Resizer', icon: ImageIcon },
    { id: 'vector-tracer', name: 'Vector Tracer', icon: ImageIcon },
    { id: 'pdf-tools', name: 'PDF Tools', icon: Files },
    { id: 'ocr-tool', name: 'Screenshot & OCR', icon: ScanText },
    { id: 'qr-studio', name: 'QR Studio', icon: ImageIcon },
    { id: 'todo-list', name: 'To-Do List', icon: ListTodo },
    { id: 'password-gen', name: 'Password Gen', icon: KeyRound },
  ];

  if (isBooting) {
    return (
      <div className="flex h-screen bg-zinc-100 dark:bg-[#0e0e0e] items-center justify-center flex-col">
        <div className="w-20 h-20 bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-2xl flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden">
          <span className="text-zinc-900 dark:text-[#ededed] font-bold text-4xl font-sans tracking-tighter animate-pulse">J</span>
          <div className="absolute inset-0 border-2 border-transparent border-t-blue-500 rounded-2xl animate-[spin_2s_linear_infinite] opacity-50"></div>
        </div>
        <h1 className="text-sm font-semibold text-zinc-900 dark:text-[#ededed] tracking-[0.2em] mb-2">JONTRO</h1>
        <p className="text-[10px] text-zinc-500 dark:text-[#737373] uppercase tracking-widest font-medium">Initializing Environment</p>
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
            className="hidden md:flex p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-[#737373] dark:hover:text-[#ededed] hover:bg-zinc-100 dark:hover:bg-[#262626] transition-all duration-200 hover:scale-110 active:scale-95"
          >
            {isDark ? <Sun size={14} className="animate-in fade-in spin-in-12" /> : <Moon size={14} className="animate-in fade-in spin-in-12" />}
          </button>
        </div>
        
        {/* Navigation */}
        <div className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          <div className="px-5 mb-3 hidden md:block">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-[#737373] uppercase tracking-widest">Workspace</span>
          </div>
          
          <div className="space-y-0.5 px-2 md:px-3">
            <button
              onClick={() => setActiveTab('home')}
              title="Dashboard"
              className={`w-full flex items-center justify-center md:justify-start px-3 py-3 md:py-2 rounded-md text-sm transition-all duration-200 hover:translate-x-1 mb-4 ${
                activeTab === 'home' 
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-[#262626] dark:text-[#ededed]' 
                  : 'hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 dark:hover:bg-[#1f1f1f] dark:text-[#a3a3a3] dark:hover:text-[#ededed]'
              }`}
            >
              <LayoutDashboard size={16} className={`md:mr-3 shrink-0 ${activeTab === 'home' ? 'text-zinc-900 dark:text-[#ededed]' : 'text-zinc-500 dark:text-[#737373]'}`} strokeWidth={activeTab === 'home' ? 2 : 1.5} />
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
                  className={`w-full flex items-center justify-center md:justify-start px-3 py-3 md:py-2 rounded-md text-sm transition-all duration-200 hover:translate-x-1 ${
                    isActive 
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-[#262626] dark:text-[#ededed]' 
                      : 'hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 dark:hover:bg-[#1f1f1f] dark:text-[#a3a3a3] dark:hover:text-[#ededed]'
                  }`}
                >
                  <Icon size={16} className={`md:mr-3 shrink-0 ${isActive ? 'text-zinc-900 dark:text-[#ededed]' : 'text-zinc-500 dark:text-[#737373]'}`} strokeWidth={isActive ? 2 : 1.5} />
                  <span className={`hidden md:block ${isActive ? 'font-medium' : 'font-normal'}`}>{tool.name}</span>
                </button>
              )
            })}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-[#262626] flex items-center justify-center md:justify-between text-xs text-zinc-500 dark:text-[#737373]">
          <span className="hidden md:block">v{pkg.version}</span>
          <div className="flex items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 md:mr-2"></div>
            <span className="hidden md:block">Online</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-[#0e0e0e]">
        {/* Header Breadcrumbs */}
        <div className="h-14 border-b border-zinc-200 dark:border-[#262626] flex items-center justify-between px-8 bg-zinc-50 dark:bg-[#0e0e0e]">
          <div className="flex items-center text-xs text-zinc-500 dark:text-[#737373]">
            <span>Workspace</span>
            <ChevronRight size={12} className="mx-2" />
            <span className="text-zinc-900 dark:text-[#ededed]">
              {activeTab === 'home' ? 'Dashboard' : tools.find(t => t.id === activeTab)?.name}
            </span>
          </div>
          <button 
            onClick={() => setIsDark(!isDark)}
            className="md:hidden flex p-2 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-[#737373] dark:hover:text-[#ededed] bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] transition-all duration-200 active:scale-95"
          >
            {isDark ? <Sun size={14} className="animate-in fade-in spin-in-12" /> : <Moon size={14} className="animate-in fade-in spin-in-12" />}
          </button>
        </div>
        
        {/* Workspace */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto h-full">
            {activeTab === 'home' && <HomeDashboard onSelectTool={setActiveTab} />}
            {activeTab === 'video-converter' && <VideoConverter />}
            {activeTab === 'todo-list' && <TodoList />}
            {activeTab === 'password-gen' && <PasswordGen />}
            {activeTab === 'image-resizer' && <ImageResizer />}
            {activeTab === 'vector-tracer' && <VectorTracer />}
            { activeTab === 'pdf-tools' && <PdfTools /> }
            { activeTab === 'ocr-tool' && <OcrTool /> }
            { activeTab === 'qr-studio' && <QrStudio /> }
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
