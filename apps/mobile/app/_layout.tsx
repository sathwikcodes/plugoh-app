import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { initializeAuth, teardownAuth, useAuthStore } from '@/store/auth';
import { createQueryClient } from '@/lib/query/client';
import { registerForPushNotificationsAsync } from '@/lib/notifications/register';
import { recoverPendingBookingVerify } from '@/lib/payments/booking-flow';

export default function RootLayout() {
  const [queryClient] = useState(() => createQueryClient());
  const session = useAuthStore((state) => state.session);

  useEffect(() => {
    initializeAuth();
    void SystemUI.setBackgroundColorAsync(theme.colors.background);
    return () => {
      teardownAuth();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    void registerForPushNotificationsAsync();
    void recoverPendingBookingVerify().catch(() => undefined);
  }, [session]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          />
          <StatusBar style="dark" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
