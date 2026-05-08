import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const SESSION_TOKEN_KEY = 'supabase_access_token';
const FALLBACK_API_BASE_URL = 'http://localhost:4000';
const API_BASE_URL = getApiBaseUrl();

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success: false;
  error: {
    message?: string;
  };
};

type ApiResponseEnvelope<T> = ApiSuccess<T> | ApiFailure;

function getApiBaseUrl() {
  const env = process.env as Record<string, unknown>;
  const fromEnv = env.EXPO_PUBLIC_API_BASE_URL;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) {
    return fromEnv;
  }

  const extra = Constants.expoConfig?.extra;
  if (extra && typeof extra === 'object') {
    const apiBaseUrl = (extra as Record<string, unknown>).apiBaseUrl;
    if (typeof apiBaseUrl === 'string' && apiBaseUrl.length > 0) {
      return apiBaseUrl;
    }
  }

  return FALLBACK_API_BASE_URL;
}

function parseApiEnvelope<T>(payload: unknown): ApiResponseEnvelope<T> {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid API response');
  }

  const source = payload as Record<string, unknown>;
  if (source.success === true) {
    return {
      success: true,
      data: source.data as T,
    };
  }

  if (source.success === false) {
    const error = source.error;
    const message =
      error && typeof error === 'object' && typeof (error as Record<string, unknown>).message === 'string'
        ? ((error as Record<string, unknown>).message as string)
        : undefined;

    return {
      success: false,
      error: { message },
    };
  }

  throw new Error('Invalid API response');
}

export async function api<TOut>(
  path: string,
  init: { method: string; body?: unknown; token?: string }
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

  const payload = parseApiEnvelope<TOut>(await response.json());
  if (!payload.success) {
    throw new Error(payload.error.message ?? 'API request failed');
  }

  return payload.data;
}
