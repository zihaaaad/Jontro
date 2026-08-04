import { useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  checkLicense, deactivateDevice, getDeviceId, revalidateCachedLicense,
  LicenseRejection, type LicensePlan,
} from './licenseClient';
import { isFirebaseConfigured } from './firebaseConfig';
import { LicenseCtx, type LicenseState } from './licenseCtx';

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LicenseState['status']>('checking');
  const [plan, setPlan] = useState<LicensePlan | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
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
          setExpiresAt(result.expiresAt);
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
      setExpiresAt(result.expiresAt);
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
      setExpiresAt(null);
      setStatus('inactive');
    }
  }, [activeKey]);

  const value: LicenseState = {
    status, plan, activeKey, expiresAt, error, activate, deactivate,
    isPremium: status === 'active',
  };

  return <LicenseCtx.Provider value={value}>{children}</LicenseCtx.Provider>;
}
