import { useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import zxcvbn from 'zxcvbn';

export default function PasswordGen() {
  const [password, setPassword] = useState('****************');
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);

  const [score, setScore] = useState(0);

  const generatePassword = () => {
    let charset = 'abcdefghijklmnopqrstuvwxyz';
    if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeNumbers) charset += '0123456789';
    if (includeSymbols) charset += '!@#$%^&*()_+~`|}{[]:;?><,./-=';

    // Rejection sampling avoids modulo bias: charset.length rarely divides
    // 2^32 evenly, so `randomUint32 % charset.length` would make some
    // characters marginally more likely than others. We discard draws that
    // fall in the biased remainder range and redraw instead.
    const maxValid = Math.floor(0xFFFFFFFF / charset.length) * charset.length;
    let newPassword = '';
    const batch = new Uint32Array(length * 2); // headroom for rejected draws
    while (newPassword.length < length) {
      window.crypto.getRandomValues(batch);
      for (let i = 0; i < batch.length && newPassword.length < length; i++) {
        if (batch[i] < maxValid) {
          newPassword += charset[batch[i] % charset.length];
        }
      }
    }
    setPassword(newPassword);
    
    // Algorithmic Entropy Analysis using zxcvbn
    const result = zxcvbn(newPassword);
    setScore(result.score); // 0 to 4
  };

  const copyToClipboard = () => {
    if(password !== '****************') {
      navigator.clipboard.writeText(password);
      toast.success('Password copied to clipboard');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-medium text-zinc-900 dark:text-[#ededed]">Password Generator</h2>
          <p className="text-sm text-zinc-500 dark:text-[#a3a3a3] mt-1">Generate cryptographically secure random passwords.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-md p-8 max-w-2xl">
        
        <div className="mb-6 flex gap-3">
          <div className="flex-1 bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-300 dark:border-[#404040] rounded-md px-4 py-3 flex flex-col justify-center relative">
            <span className="text-lg font-mono text-zinc-900 dark:text-[#ededed] tracking-wider break-all z-10">
              {password}
            </span>
            {/* Algorithmic strength bar */}
            {password !== '****************' && (
              <div className="absolute bottom-0 left-0 h-1 rounded-bl-md rounded-br-md transition-none" style={{
                width: `${(score + 1) * 20}%`,
                backgroundColor: score < 2 ? '#ef4444' : score < 4 ? '#eab308' : '#22c55e'
              }}></div>
            )}
          </div>
          <button 
            onClick={copyToClipboard}
            className="px-4 bg-zinc-100 dark:bg-[#262626] hover:bg-zinc-200 dark:hover:bg-[#333333] border border-zinc-300 dark:border-[#404040] text-zinc-700 dark:text-[#ededed] rounded-md transition-none flex items-center justify-center h-[54px]"
          >
            <Copy size={16} />
          </button>
        </div>
        
        {password !== '****************' && (
          <div className="mb-6 text-xs font-medium text-zinc-500 dark:text-[#838383] uppercase tracking-wider flex items-center">
            Algorithmic Entropy: <span className={`ml-2 px-2 py-0.5 rounded text-white ${score < 2 ? 'bg-red-500' : score < 4 ? 'bg-yellow-500' : 'bg-green-500'}`}>{score < 2 ? 'Weak' : score < 4 ? 'Good' : 'Uncrackable'}</span>
          </div>
        )}

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
                  className="w-4 h-4 rounded-sm border border-zinc-300 dark:border-[#404040] bg-white dark:bg-[#0e0e0e] checked:bg-blue-500 checked:border-blue-500 appearance-none flex items-center justify-center before:content-[''] before:w-2 before:h-2 before:bg-white before:scale-0 checked:before:scale-100 before:transition-none"
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
