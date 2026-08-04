import { createContext } from 'react';
import type { LicensePlan } from './licenseClient';

export interface LicenseState {
  status: 'checking' | 'inactive' | 'active' | 'error';
  plan: LicensePlan | null;
  activeKey: string | null;
  error: string | null;
  activate: (key: string) => Promise<boolean>;
  deactivate: () => Promise<void>;
  isPremium: boolean;
}

export const LicenseCtx = createContext<LicenseState | null>(null);
