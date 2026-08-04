import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useLicense } from './useLicense';

export default function PremiumGate({ toolName, onActivate, children }: {
  toolName: string;
  onActivate: () => void;
  children: ReactNode;
}) {
  const { isPremium, status } = useLicense();

  if (status === 'checking') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-zinc-300 dark:border-[#404040] border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (isPremium) return <>{children}</>;

  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center mb-4">
        <Lock size={22} className="text-blue-500" />
      </div>
      <h3 className="text-base font-medium text-zinc-900 dark:text-[#ededed] mb-1.5">{toolName} is a Premium Tool</h3>
      <p className="text-sm text-zinc-500 dark:text-[#838383] max-w-sm mb-6">
        Unlock {toolName} and every other native tool with a Jontro plan. Password Generator, Task Manager, and QR Studio stay free forever.
      </p>
      <button
        onClick={onActivate}
        className="px-4 py-2 rounded-md text-sm font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0e0e0e] transition-none active:scale-[0.98]"
      >
        View Plans
      </button>
    </div>
  );
}
