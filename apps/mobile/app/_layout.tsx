import { AppScreenRoot } from '@/components/ui/app-screen-root';
import { appFontAssets } from '@/constants/app-font-assets';
import { installGlobalTextFontDefaults } from '@/constants/app-fonts';
import { theme } from '@/constants/theme';
import { getPushNotificationsPreference } from '@/lib/notifications/preference';
import { registerForPushNotificationsAsync } from '@/lib/notifications/register';
import { recoverPendingBookingVerify } from '@/lib/payments/booking-flow';
import { createQueryClient } from '@/lib/query/client';
import { initializeAuth, teardownAuth, useAuthStore } from '@/store/auth';
import { DarkTheme, ThemeProvider, type Theme as NavigationTheme } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useRef, useState } from 'react';
import { Appearance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Force dark mode at the native iOS level immediately — affects UITabBar,
// UIAlertController, and all system chrome. Required for tab bar to stay
// dark during transitions without a native rebuild.
Appearance.setColorScheme('dark');
installGlobalTextFontDefaults();
void SplashScreen.preventAutoHideAsync();

const navigationTheme: NavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: theme.colors.accentStrong,
    background: theme.colors.background,
    card: theme.colors.background,
    text: theme.colors.foreground,
    border: theme.colors.border,
    notification: theme.colors.accentStrong,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontLoadError] = useFonts(appFontAssets);
  const [queryClient] = useState(() => createQueryClient());
  const initialized = useAuthStore((state) => state.initialized);
  const session = useAuthStore((state) => state.session);
  const sessionUserId = session?.user.id ?? null;
  const previousSessionUserId = useRef<string | null>(null);

  useEffect(() => {
    if (previousSessionUserId.current !== sessionUserId) {
      queryClient.clear();
      previousSessionUserId.current = sessionUserId;
    }
  }, [queryClient, sessionUserId]);

  useEffect(() => {
    initializeAuth();
    void SystemUI.setBackgroundColorAsync(theme.colors.background);
    return () => {
      teardownAuth();
    };
  }, []);

  useEffect(() => {
    if (!initialized || !fontsLoaded) return;
    void SplashScreen.hideAsync();
  }, [fontsLoaded, initialized]);

  useEffect(() => {
    if (!session) return;
    if (!getPushNotificationsPreference()) return;
    void registerForPushNotificationsAsync();
    void recoverPendingBookingVerify().catch(() => undefined);
  }, [session]);

  if (fontLoadError) {
    throw fontLoadError;
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.backgroundDeep }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={navigationTheme}>
            <AppScreenRoot>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: theme.colors.backgroundClear },
                }}
              />
            </AppScreenRoot>
            <StatusBar style="light" />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
