import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { theme } from '@/constants/theme';
import { useGate } from '@/hooks/use-gate';

export default function OnboardingLayout() {
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
  if (gate.status === 'error') return <Redirect href="/(app)/(tabs)" />;
  if (gate.status === 'unauthenticated') return <Redirect href="/(auth)/login" />;
  if (gate.status === 'ready')
    return (
      <Redirect
        href={gate.bootstrap.data?.role === 'business' ? '/(app)/(brand-tabs)' : '/(app)/(tabs)'}
      />
    );
  return <Stack screenOptions={{ headerShown: false }} />;
}
