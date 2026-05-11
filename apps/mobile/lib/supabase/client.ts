import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required. Create apps/mobile/.env from apps/mobile/.env.example and fill them in.',
  );
}

// SecureStore has a 2048-byte limit per key; chunk large values (Supabase sessions are ~3-5 KB)
const CHUNK_SIZE = 1900;

const storage = {
  getItem: async (key: string): Promise<string | null> => {
    const numChunksStr = await SecureStore.getItemAsync(`${key}.n`);
    if (numChunksStr !== null) {
      const n = Number(numChunksStr);
      const chunks = await Promise.all(
        Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)),
      );
      if (chunks.some((c) => c === null)) return null;
      return chunks.join('');
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.deleteItemAsync(`${key}.n`);
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'g')) ?? [];
    await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}.${i}`, chunk)));
    await SecureStore.setItemAsync(`${key}.n`, String(chunks.length));
    await SecureStore.deleteItemAsync(key);
  },
  removeItem: async (key: string): Promise<void> => {
    const numChunksStr = await SecureStore.getItemAsync(`${key}.n`);
    if (numChunksStr !== null) {
      const n = Number(numChunksStr);
      await Promise.all([
        ...Array.from({ length: n }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)),
        SecureStore.deleteItemAsync(`${key}.n`),
      ]);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
