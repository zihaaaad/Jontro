import { useContext } from 'react';
import { LicenseCtx, type LicenseState } from './licenseCtx';

export function useLicense(): LicenseState {
  const ctx = useContext(LicenseCtx);
  if (!ctx) throw new Error('useLicense must be used within a LicenseProvider');
  return ctx;
}
