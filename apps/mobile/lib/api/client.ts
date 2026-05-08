import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import type { ApiResponse } from '@plugoh/contracts';

const SESSION_TOKEN_KEY = 'supabase_access_token';
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'http://localhost:4000';

export async function api<TIn, TOut>(
  path: string,
  init: { method: string; body?: TIn; token?: string }
): Promise<TOut> {
  const token = init.token ?? (await SecureStore.getItemAsync(SESSION_TOKEN_KEY)) ?? undefined;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: init.method,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const payload = (await response.json()) as ApiResponse<TOut>;
  if (!payload.success) {
    throw new Error(payload.error.message);
  }

  return payload.data;
}
