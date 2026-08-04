import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore, doc, runTransaction, deleteField, type Firestore,
} from 'firebase/firestore';
import { firebaseConfig, LICENSES_COLLECTION, isFirebaseConfigured } from './firebaseConfig';

export type LicensePlan = 'monthly' | 'yearly' | 'lifetime';
export type LicenseStatus = 'active' | 'revoked' | 'refunded';

export interface LicenseDoc {
  email: string;
  name?: string;
  plan: LicensePlan;
  status: LicenseStatus;
  expiresAt: number | null; // epoch ms, null for lifetime
  deviceLimit: number;
  activatedDevices: { deviceId: string; activatedAt: number }[];
  lastValidatedAt?: number;
}

export type RejectionReason = 'not-found' | 'revoked' | 'refunded' | 'expired' | 'limit-reached';

// Distinct from network/connectivity failures so callers know a "no" is a
// real, trustworthy answer (bad key) rather than "we couldn't reach the
// server, fall back to the offline cache instead."
export class LicenseRejection extends Error {
  reason: RejectionReason;
  constructor(reason: RejectionReason, message: string) {
    super(message);
    this.name = 'LicenseRejection';
    this.reason = reason;
  }
}

export interface LicenseCheckResult {
  key: string;
  plan: LicensePlan;
  status: LicenseStatus;
  expiresAt: number | null;
  source: 'online' | 'cache';
}

const DEVICE_ID_STORAGE_KEY = 'jontro-device-id';
const LICENSE_CACHE_KEY = 'jontro-license-cache';
// How long a previously-valid license keeps working with no internet before
// we require a fresh online check again. Long enough that a normal offline
// flight/outage never locks out a paying customer, short enough that a
// revoked/expired license doesn't stay "active" indefinitely if the device
// somehow never reconnects.
const OFFLINE_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
function getDb(): Firestore {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured yet - fill in src/lib/license/firebaseConfig.ts');
  }
  if (!db) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
  return db;
}

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
  }
  return id;
}

function readCache(): (LicenseCheckResult & { cachedAt: number }) | null {
  try {
    const raw = localStorage.getItem(LICENSE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(result: LicenseCheckResult) {
  localStorage.setItem(LICENSE_CACHE_KEY, JSON.stringify({ ...result, cachedAt: Date.now() }));
}

export function clearLicenseCache() {
  localStorage.removeItem(LICENSE_CACHE_KEY);
}

/**
 * Validates a license key against Firestore and registers this device
 * against it (inside a transaction, so two simultaneous activations at the
 * device-limit boundary can't both slip through). Throws LicenseRejection
 * for a definitive "no" (bad key, revoked, expired, device limit hit) -
 * any other thrown error is assumed to be a connectivity problem.
 */
export async function checkLicenseOnline(key: string, deviceId: string): Promise<LicenseCheckResult> {
  const trimmedKey = key.trim();
  if (!trimmedKey) throw new LicenseRejection('not-found', 'License key is empty.');

  const database = getDb();
  const ref = doc(database, LICENSES_COLLECTION, trimmedKey);

  const data = await runTransaction(database, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new LicenseRejection('not-found', 'No license found for that key. Double-check it was copied correctly.');
    }
    const license = snap.data() as LicenseDoc;

    if (license.status === 'revoked') {
      throw new LicenseRejection('revoked', 'This license has been revoked.');
    }
    if (license.status === 'refunded') {
      throw new LicenseRejection('refunded', 'This license was refunded and is no longer active.');
    }
    if (license.expiresAt !== null && Date.now() > license.expiresAt) {
      throw new LicenseRejection('expired', 'This license has expired. Renew to keep using premium tools.');
    }

    const devices = license.activatedDevices || [];
    const alreadyRegistered = devices.some((d) => d.deviceId === deviceId);

    if (!alreadyRegistered) {
      if (devices.length >= license.deviceLimit) {
        throw new LicenseRejection(
          'limit-reached',
          `This license is already active on ${license.deviceLimit} device(s). Deactivate one first.`,
        );
      }
      tx.update(ref, {
        activatedDevices: [...devices, { deviceId, activatedAt: Date.now() }],
        lastValidatedAt: Date.now(),
      });
    } else {
      tx.update(ref, { lastValidatedAt: Date.now() });
    }

    return license;
  });

  const result: LicenseCheckResult = {
    key: trimmedKey,
    plan: data.plan,
    status: data.status,
    expiresAt: data.expiresAt,
    source: 'online',
  };
  writeCache(result);
  return result;
}

/** Frees this device's activation slot (e.g. before reinstalling/switching PCs). */
export async function deactivateDevice(key: string, deviceId: string): Promise<void> {
  const database = getDb();
  const ref = doc(database, LICENSES_COLLECTION, key.trim());

  await runTransaction(database, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const license = snap.data() as LicenseDoc;
    const devices = (license.activatedDevices || []).filter((d) => d.deviceId !== deviceId);
    tx.update(ref, { activatedDevices: devices, lastValidatedAt: deleteField() });
  });

  clearLicenseCache();
}

/**
 * Top-level entry point the UI calls: tries the network, and only falls
 * back to the last known-good cached result (within the grace period) if
 * the failure looks like a connectivity problem rather than a real
 * rejection (bad key, revoked, expired, limit reached).
 */
export async function checkLicense(key: string): Promise<LicenseCheckResult> {
  const deviceId = getDeviceId();
  try {
    return await checkLicenseOnline(key, deviceId);
  } catch (err) {
    if (err instanceof LicenseRejection) {
      clearLicenseCache();
      throw err;
    }

    const cached = readCache();
    if (cached && cached.key === key.trim() && cached.status === 'active') {
      const age = Date.now() - cached.cachedAt;
      if (age < OFFLINE_GRACE_PERIOD_MS) {
        return { ...cached, source: 'cache' };
      }
    }
    throw err;
  }
}

/** Silent re-check used on app startup for an already-activated key. */
export async function revalidateCachedLicense(): Promise<LicenseCheckResult | null> {
  const cached = readCache();
  if (!cached) return null;
  try {
    return await checkLicense(cached.key);
  } catch {
    return null;
  }
}
