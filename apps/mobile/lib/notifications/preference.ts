type Mmkv = {
  getBoolean: (key: string) => boolean | undefined;
  set: (key: string, value: boolean) => void;
};

let mmkv: Mmkv | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MMKV } = require('react-native-mmkv') as {
    MMKV: new (opts: { id: string }) => Mmkv;
  };
  mmkv = new MMKV({ id: 'plugoh-app-prefs' });
} catch {
  mmkv = null;
}

const PUSH_ENABLED_KEY = 'push-notifications-enabled';

let memoryFallback = true;

/** When true (default), app may register for remote push after sign-in. */
export function getPushNotificationsPreference(): boolean {
  if (mmkv) {
    const v = mmkv.getBoolean(PUSH_ENABLED_KEY);
    if (v === undefined) return true;
    return v;
  }
  return memoryFallback;
}

export function setPushNotificationsPreference(enabled: boolean) {
  memoryFallback = enabled;
  mmkv?.set(PUSH_ENABLED_KEY, enabled);
}
