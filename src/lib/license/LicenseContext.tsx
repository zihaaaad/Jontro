import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  checkLicense, deactivateDevice, getDeviceId, revalidateCachedLicense,
  LicenseRejection, type LicensePlan,
} from './licenseClient';
import { isFirebaseConfigured } from './firebaseConfig';

interface LicenseState {
  status: 'checking' | 'inactive' | 'active' | 'error';
  plan: LicensePlan | null;
  activeKey: string | null;
  error: string | null;
  activate: (key: string) => Promise<boolean>;
  deactivate: () => Promise<void>;
  isPremium: boolean;
}

const LicenseCtx = createContext<LicenseState | null>(null);

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LicenseState['status']>('checking');
  const [plan, setPlan] = useState<LicensePlan | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setStatus('inactive');
      return;
    }
    revalidateCachedLicense()
      .then((result) => {
        if (result && result.status === 'active') {
          setPlan(result.plan);
          setActiveKey(result.key);
          setStatus('active');
        } else {
          setStatus('inactive');
        }
      })
      .catch(() => setStatus('inactive'));
  }, []);

  const activate = useCallback(async (key: string) => {
    setStatus('checking');
    setError(null);
    try {
      const result = await checkLicense(key);
      setPlan(result.plan);
      setActiveKey(result.key);
      setStatus('active');
      return true;
    } catch (err) {
      const message = err instanceof LicenseRejection
        ? err.message
        : 'Could not reach the license server. Check your internet connection and try again.';
      setError(message);
      setStatus('inactive');
      return false;
    }
  }, []);

  const deactivate = useCallback(async () => {
    if (!activeKey) return;
    try {
      await deactivateDevice(activeKey, getDeviceId());
    } finally {
      setPlan(null);
      setActiveKey(null);
      setStatus('inactive');
    }
  }, [activeKey]);

  const value: LicenseState = {
    status, plan, activeKey, error, activate, deactivate,
    isPremium: status === 'active',
  };

  return <LicenseCtx.Provider value={value}>{children}</LicenseCtx.Provider>;
}

export function useLicense(): LicenseState {
  const ctx = useContext(LicenseCtx);
  if (!ctx) throw new Error('useLicense must be used within a LicenseProvider');
  return ctx;
}
