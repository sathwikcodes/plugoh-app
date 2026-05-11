import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AccentHero, PrimaryButton, Screen, SectionTitle } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useBootstrap, useBusinessProfile, useInfluencerProfile } from '@/hooks/use-marketplace';

export default function AiGeneratingScreen() {
  const bootstrap = useBootstrap();
  const profile = useInfluencerProfile();
  const businessProfile = useBusinessProfile();
  const role = bootstrap.data?.role ?? 'influencer';

  useEffect(() => {
    const influencerReady = Boolean(
      profile.data?.category &&
      (profile.data.price_per_reel || profile.data.price_per_post || profile.data.price_per_story),
    );
    const businessReady = Boolean(
      businessProfile.data?.brand_summary && businessProfile.data.tagline,
    );
    if ((role === 'influencer' && influencerReady) || (role === 'business' && businessReady)) {
      router.replace(role === 'business' ? '/(app)/(brand-tabs)' : '/(app)/(tabs)');
    }
    const timer = setInterval(() => {
      if (role === 'business') {
        void businessProfile.refetch();
      } else {
        void profile.refetch();
      }
    }, 3000);
    const timeout = setTimeout(() => {
      router.replace(role === 'business' ? '/(app)/(brand-tabs)' : '/(app)/(tabs)');
    }, 60000);
    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, [businessProfile, profile, role]);

  return (
    <Screen>
      <AccentHero
        title="Generating your profile"
        subtitle="We’re shaping a clean first version from your connected creator signals."
      />
      <SectionTitle
        title="AI is filling the gaps"
        subtitle={
          role === 'business'
            ? 'Brand summary and tagline will appear automatically once ready.'
            : 'Category, pricing suggestions, and creator summary will appear automatically once ready.'
        }
      />
      <View style={{ alignItems: 'center', paddingVertical: 40, gap: 16 }}>
        <ActivityIndicator color={theme.colors.accentStrong} size="large" />
        <Text style={{ ...theme.typography.body, color: theme.colors.muted, textAlign: 'center' }}>
          This usually takes under a minute.
        </Text>
      </View>
      <PrimaryButton
        label="Continue manually"
        onPress={() => {
          router.replace(role === 'business' ? '/(app)/(brand-tabs)' : '/(app)/(tabs)');
        }}
      />
    </Screen>
  );
}
