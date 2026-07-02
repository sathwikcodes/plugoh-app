import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { ApiError } from '@/lib/api/error';

let onlineManagerConfigured = false;
let focusManagerConfigured = false;

function configureOnlineManager() {
  if (onlineManagerConfigured) return;
  onlineManagerConfigured = true;
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected) && state.isInternetReachable !== false;
      setOnline(online);
    }),
  );
}

function configureFocusManager() {
  if (focusManagerConfigured || Platform.OS === 'web') return;
  focusManagerConfigured = true;
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (state) => {
      setFocused(state === 'active');
    });
    setFocused(AppState.currentState === 'active');
    return () => {
      subscription.remove();
    };
  });
}

function shouldRetryQuery(error: unknown, failureCount: number) {
  if (failureCount >= 2) return false;
  if (error instanceof ApiError) {
    if (error.code === 'TIMEOUT' || error.code === 'NETWORK_ERROR') return true;
    return error.status >= 500;
  }
  return true;
}

export function createQueryClient() {
  configureOnlineManager();
  configureFocusManager();
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
        retryDelay: (attempt) => Math.min(1000 * 2 ** Math.max(attempt - 1, 0), 8000),
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
      },
    },
  });
}
