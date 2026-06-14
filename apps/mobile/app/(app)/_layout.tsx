import { AppScreenRoot } from '@/components/ui/app-screen-root';
import { BootstrapErrorScreen } from '@/components/ui/bootstrap-error';
import { theme } from '@/constants/theme';
import { useGate } from '@/hooks/use-gate';
import { Redirect, Stack, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function AppLayout() {
  const gate = useGate();
  const segments = useSegments();
  const segmentPath = segments as unknown as string[];
  if (gate.status === 'loading') {
    return (
      <AppScreenRoot>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.backgroundClear,
          }}
        >
          <ActivityIndicator color={theme.colors.accentStrong} />
        </View>
      </AppScreenRoot>
    );
  }
  if (gate.status === 'error') {
    return (
      <BootstrapErrorScreen
        message={
          gate.bootstrap.error instanceof Error
            ? gate.bootstrap.error.message
            : 'Unknown bootstrap error'
        }
        onRetry={() => {
          void gate.bootstrap.refetch();
        }}
      />
    );
  }
  if (gate.status === 'unauthenticated') return <Redirect href="/(auth)/login" />;
  if (gate.status === 'needs_role') return <Redirect href="/(onboarding)/role-select" />;
  if (gate.status === 'needs_basics') return <Redirect href="/(onboarding)/basics" />;
  if (gate.status === 'needs_brand_choice') return <Redirect href="/(onboarding)/brand-choice" />;
  if (gate.status === 'needs_brand_details') return <Redirect href="/(onboarding)/brand-details" />;
  if (gate.status === 'needs_instagram') return <Redirect href="/(onboarding)/instagram-connect" />;
  if (gate.status === 'ai_pending') return <Redirect href="/(onboarding)/ai-generating" />;

  const role = gate.bootstrap.data?.role;
  if (role === 'business' && segmentPath.includes('(tabs)')) {
    return <Redirect href="/(app)/(brand-tabs)" />;
  }
  if (role === 'influencer' && segmentPath.includes('(brand-tabs)')) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {role === 'business' ? <Stack.Screen name="(brand-tabs)" /> : <Stack.Screen name="(tabs)" />}
      <Stack.Screen name="campaigns/[id]/index" />
      <Stack.Screen name="campaigns/[id]/brand" />
      <Stack.Screen name="creator/[id]" />
      <Stack.Screen name="booking/[id]" />
      <Stack.Screen name="booking/success" />
      <Stack.Screen name="inbox/[id]" />
      <Stack.Screen name="delivery/[campaignId]" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="profile/index" />
      <Stack.Screen name="brand-profile" />
      <Stack.Screen name="profile/edit" />
      <Stack.Screen name="profile/pricing" />
      <Stack.Screen name="profile/instagram" />
      <Stack.Screen name="profile/payout" />
      <Stack.Screen name="profile/settings" />
    </Stack>
  );
}
