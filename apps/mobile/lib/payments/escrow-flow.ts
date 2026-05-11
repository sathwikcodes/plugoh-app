import * as SecureStore from 'expo-secure-store';

type MmkvStorage = {
  set: (key: string, value: string) => void;
  getString: (key: string) => string | undefined;
  delete: (key: string) => void;
};
let mmkvStorage: MmkvStorage | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MMKV } = require('react-native-mmkv') as {
    MMKV: new (opts: { id: string }) => MmkvStorage;
  };
  mmkvStorage = new MMKV({ id: 'plugoh-payments' });
} catch {
  mmkvStorage = null;
}
const PENDING_VERIFY_KEY = 'pending-booking-verify';

export type PendingBookingVerify = {
  idempotencyKey: string;
  payload: Record<string, unknown>;
  createdAt: number;
};

export async function setPendingBookingVerify(input: PendingBookingVerify) {
  const value = JSON.stringify(input);
  if (mmkvStorage) {
    mmkvStorage.set(PENDING_VERIFY_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(PENDING_VERIFY_KEY, value);
}

export async function getPendingBookingVerify(): Promise<PendingBookingVerify | null> {
  const raw = mmkvStorage
    ? mmkvStorage.getString(PENDING_VERIFY_KEY)
    : await SecureStore.getItemAsync(PENDING_VERIFY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingBookingVerify;
  } catch {
    return null;
  }
}

export async function clearPendingBookingVerify() {
  if (mmkvStorage) {
    mmkvStorage.delete(PENDING_VERIFY_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(PENDING_VERIFY_KEY);
}
