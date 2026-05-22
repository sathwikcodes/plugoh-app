import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { theme } from '@/constants/theme';
import { useGate } from '@/hooks/use-gate';

export default function AuthLayout() {
  const gate = useGate();
  if (gate.status === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator color={theme.colors.accentStrong} />
      </View>
    );
  }
  if (gate.status === 'error') return <Redirect href="/(app)" />;
  if (gate.status === 'unauthenticated') {
    return (
      <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
        <Stack.Screen name="login" options={{ animation: 'none' }} />
        <Stack.Screen
          name="email"
          options={{
            animation: 'slide_from_right',
            headerShown: true,
            headerTitle: '',
            headerTransparent: true,
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="verify"
          options={{
            animation: 'slide_from_right',
            headerShown: true,
            headerTitle: '',
            headerTransparent: true,
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
      </Stack>
    );
  }
  if (gate.status === 'ready') return <Redirect href="/(app)" />;
  if (gate.status === 'needs_role') return <Redirect href="/(onboarding)/role-select" />;
  if (gate.status === 'needs_basics') return <Redirect href="/(onboarding)/basics" />;
  if (gate.status === 'needs_brand_choice') return <Redirect href="/(onboarding)/brand-choice" />;
  if (gate.status === 'needs_brand_details') return <Redirect href="/(onboarding)/brand-details" />;
  if (gate.status === 'needs_instagram') return <Redirect href="/(onboarding)/instagram-connect" />;
  return <Redirect href="/(onboarding)/ai-generating" />;
}
