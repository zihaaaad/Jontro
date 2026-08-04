import { useState } from 'react';
import { CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useLicense } from '../lib/license/useLicense';
import { isFirebaseConfigured } from '../lib/license/firebaseConfig';
// Single source of truth for pricing, shared with the marketing site
// (docs/pricing.json fetches this same file at runtime) so a price change
// only ever needs editing in one place.
import pricing from '../../docs/pricing.json';

const PLANS = pricing.plans;

export default function LicenseActivation() {
  const { isPremium, plan, status, activate, deactivate, error } = useLicense();
  const [key, setKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setIsSubmitting(true);
    const ok = await activate(key.trim());
    setIsSubmitting(false);
    if (ok) {
      toast.success('License activated - premium tools unlocked!');
      setKey('');
    } else {
      toast.error('Could not activate that key.');
    }
  };

  const handleDeactivate = async () => {
    await deactivate();
    toast.success('This device has been deactivated.');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-8">
        <h2 className="text-2xl font-medium text-zinc-900 dark:text-[#ededed]">License</h2>
        <p className="text-sm text-zinc-500 dark:text-[#838383] mt-1">Activate a plan to unlock every native tool.</p>
      </div>

      {!isFirebaseConfigured() && (
        <div className="mb-6 p-4 rounded-md border border-yellow-200 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-950/20 text-sm text-yellow-800 dark:text-yellow-400">
          Licensing isn't configured yet in this build.
        </div>
      )}

      <div className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-md p-8 max-w-2xl mb-8">
        {isPremium ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 flex items-center justify-center mr-4">
                <CheckCircle2 size={18} className="text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-[#ededed] capitalize">{plan} plan active</p>
                <p className="text-xs text-zinc-500 dark:text-[#838383]">All premium tools are unlocked on this device.</p>
              </div>
            </div>
            <button
              onClick={handleDeactivate}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-300 dark:border-[#404040] text-zinc-600 dark:text-[#a3a3a3] hover:bg-zinc-50 dark:hover:bg-[#1a1a1a] transition-none"
            >
              Deactivate this device
            </button>
          </div>
        ) : (
          <form onSubmit={handleActivate}>
            <label className="block text-xs text-zinc-500 dark:text-[#a3a3a3] mb-1.5 flex items-center">
              <KeyRound size={12} className="mr-1" /> License Key
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Paste your license key"
                disabled={status === 'checking' || isSubmitting}
                className="flex-1 bg-zinc-50 dark:bg-[#0e0e0e] border border-zinc-300 dark:border-[#404040] rounded text-sm px-3 py-2 text-zinc-900 dark:text-[#ededed] focus:outline-none focus:border-zinc-500 dark:focus:border-[#838383]"
              />
              <button
                type="submit"
                disabled={!key.trim() || status === 'checking' || isSubmitting}
                className="px-5 py-2 rounded-md text-sm font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0e0e0e] disabled:opacity-50 transition-none active:scale-[0.98]"
              >
                {isSubmitting ? 'Checking...' : 'Activate'}
              </button>
            </div>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </form>
        )}
      </div>

      {!isPremium && (
        <>
          <h3 className="text-xs font-medium text-zinc-500 dark:text-[#838383] uppercase tracking-wider mb-3">Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
            {PLANS.map((p) => (
              <div key={p.id} className="relative bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-md p-5">
                {p.badge && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-blue-500 text-white text-[9px] font-bold uppercase tracking-wide">{p.badge}</span>
                )}
                <div className="flex items-center mb-2">
                  <ShieldCheck size={14} className="text-zinc-400 dark:text-[#838383] mr-1.5" />
                  <span className="text-sm font-medium text-zinc-900 dark:text-[#ededed]">{p.name}</span>
                </div>
                <p className="text-xl font-semibold text-zinc-900 dark:text-[#ededed]">{p.priceUsd} <span className="text-xs font-normal text-zinc-500 dark:text-[#838383]">{p.unit}</span></p>
                <p className="text-xs text-zinc-500 dark:text-[#838383]">{p.priceBdt} in Bangladesh</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500 dark:text-[#838383] mt-4 max-w-2xl">
            Purchasing isn't live inside the app yet.{' '}
            <a
              href="https://zihaaaad.github.io/Jontro/#pricing"
              className="text-blue-500 hover:text-blue-400 underline underline-offset-2"
            >
              See the Jontro website for the current way to get a key
            </a>
            {' '}(bKash/Nagad accepted in Bangladesh).
          </p>
        </>
      )}
    </div>
  );
}
