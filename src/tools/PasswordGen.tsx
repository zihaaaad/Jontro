import { useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function PasswordGen() {
  const [password, setPassword] = useState('••••••••••••••••');
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);

  const generatePassword = () => {
    let charset = 'abcdefghijklmnopqrstuvwxyz';
    if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeNumbers) charset += '0123456789';
    if (includeSymbols) charset += '!@#$%^&*()_+~`|}{[]:;?><,./-=';

    let newPassword = '';
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      newPassword += charset[array[i] % charset.length];
    }
    setPassword(newPassword);
  };

  const copyToClipboard = () => {
    if(password !== '••••••••••••••••') {
      navigator.clipboard.writeText(password);
      toast.success('Password copied to clipboard');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-8">
        <h2 className="text-2xl font-medium text-zinc-900 dark:text-[#ededed]">Password Generator</h2>
        <p className="text-sm text-zinc-500 dark:text-[#a3a3a3] mt-1">Generate cryptographically secure random passwords.</p>
      </div>

      <div className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-md p-8 max-w-2xl">
        
        <div className="mb-8 flex gap-3">
          <div className="flex-1 bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-300 dark:border-[#404040] rounded-md px-4 py-3 flex items-center">
            <span className="text-lg font-mono text-zinc-900 dark:text-[#ededed] tracking-wider break-all">
              {password}
            </span>
          </div>
          <button 
            onClick={copyToClipboard}
            className="px-4 bg-zinc-100 dark:bg-[#262626] hover:bg-zinc-200 dark:hover:bg-[#333333] border border-zinc-300 dark:border-[#404040] text-zinc-700 dark:text-[#ededed] rounded-md transition-none flex items-center justify-center"
          >
            <Copy size={16} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <label className="text-zinc-500 dark:text-[#a3a3a3]">Length</label>
              <span className="text-zinc-900 dark:text-[#ededed] font-mono">{length}</span>
            </div>
            <input 
              type="range" min="8" max="64" value={length}
              onChange={(e) => setLength(parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-200 dark:bg-[#262626] rounded-none appearance-none cursor-pointer accent-zinc-900 dark:accent-[#ededed]"
            />
          </div>

          <div className="space-y-3 pt-6 border-t border-zinc-200 dark:border-[#262626]">
            {[
              { label: 'Lowercase (a-z)', state: true, disabled: true },
              { label: 'Uppercase (A-Z)', state: includeUppercase, set: setIncludeUppercase },
              { label: 'Numbers (0-9)', state: includeNumbers, set: setIncludeNumbers },
              { label: 'Symbols (!@#$)', state: includeSymbols, set: setIncludeSymbols },
            ].map((item, i) => (
              <label key={i} className={`flex items-center ${item.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                {/* Bug fix: Added light mode background for checkboxes */}
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded-sm border border-zinc-300 dark:border-[#404040] bg-white dark:bg-[#0e0e0e] checked:bg-blue-500 checked:border-blue-500 appearance-none flex items-center justify-center before:content-[''] before:w-2 before:h-2 before:bg-white before:scale-0 checked:before:scale-100 before:transition-transform"
                  checked={item.state} 
                  disabled={item.disabled}
                  onChange={() => item.set && item.set(!item.state)} 
                />
                <span className="ml-3 text-sm text-zinc-700 dark:text-[#ededed]">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-[#262626]">
          <button 
            onClick={generatePassword}
            className="w-full flex items-center justify-center py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0e0e0e] rounded-md text-sm font-medium transition-none"
          >
            <RefreshCw size={14} className="mr-2" />
            Generate Password
          </button>
        </div>
      </div>
    </div>
  );
}
