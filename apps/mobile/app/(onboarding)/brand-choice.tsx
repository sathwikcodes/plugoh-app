import { router } from 'expo-router';
import { Alert, Text } from 'react-native';
import {
  AccentHero,
  Card,
  PrimaryButton,
  Screen,
  SectionTitle,
  SecondaryButton,
} from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useMarketplaceMutations } from '@/hooks/use-marketplace';
import { setPreferredRole } from '@/lib/onboarding/role-preference';
import { useAuthStore } from '@/store/auth';
import { instagramConnect } from '@/lib/api/endpoints';
import * as WebBrowser from 'expo-web-browser';

export default function BrandChoiceScreen() {
  const session = useAuthStore((state) => state.session);
  const mutations = useMarketplaceMutations();

  const continueManual = () => {
    router.replace('/(onboarding)/brand-details');
  };

  const connectInstagram = async () => {
    if (!session?.user.id) return;
    setPreferredRole('business');
    try {
      await mutations.setRole.mutateAsync({ role: 'business' });
      const { url } = await instagramConnect(session.user.id, 'business');
      const result = await WebBrowser.openAuthSessionAsync(url, 'plugoh://instagram/callback');
      if (result.type === 'success') {
        router.replace('/(onboarding)/ai-generating');
      }
    } catch {
      Alert.alert('Instagram connection failed', 'Switching to manual brand setup.');
      router.replace('/(onboarding)/brand-details');
    }
  };

  return (
    <Screen>
      <AccentHero
        title="Brand onboarding path"
        subtitle="Use manual setup or connect Instagram for AI-assisted profile completion."
      />
      <SectionTitle
        title="How do you want to continue?"
        subtitle="Both paths can be edited later from profile settings."
      />
      <Card>
        <Text style={{ ...theme.typography.cardTitle, color: theme.colors.foreground }}>
          Manual setup
        </Text>
        <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
          Add brand name and type now, then start discovery and booking.
        </Text>
        <PrimaryButton label="Manual setup" onPress={continueManual} />
      </Card>
      <Card>
        <Text style={{ ...theme.typography.cardTitle, color: theme.colors.foreground }}>
          Instagram-assisted setup
        </Text>
        <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
          Connect Instagram and let AI generate your summary and tagline.
        </Text>
        <SecondaryButton label="Connect Instagram" onPress={connectInstagram} />
      </Card>
    </Screen>
  );
}
