import { router } from 'expo-router';
import { Text } from 'react-native';
import { AccentHero, Card, PrimaryButton, Screen, SectionTitle } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useMarketplaceMutations } from '@/hooks/use-marketplace';
import { setPreferredRole } from '@/lib/onboarding/role-preference';

export default function RoleSelectScreen() {
  const mutations = useMarketplaceMutations();

  const pickRole = async (role: 'business' | 'influencer') => {
    setPreferredRole(role);
    try {
      await mutations.setRole.mutateAsync({ role });
    } catch (error) {
      console.warn('Role upsert failed; proceeding with local preference', error);
    }
    router.replace('/(onboarding)/basics');
  };

  return (
    <Screen>
      <AccentHero
        title="Choose your workspace"
        subtitle="Your role changes navigation, campaign actions, and payment flow."
      />
      <SectionTitle
        title="Select role"
        subtitle="This can be changed later from account settings."
      />
      <Card>
        <Text style={{ ...theme.typography.cardTitle, color: theme.colors.foreground }}>
          Business / Brand
        </Text>
        <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
          Discover creators, book campaigns, fund escrow, and review deliveries.
        </Text>
        <PrimaryButton label="Continue as Brand" onPress={() => pickRole('business')} />
      </Card>
      <Card>
        <Text style={{ ...theme.typography.cardTitle, color: theme.colors.foreground }}>
          Influencer / Creator
        </Text>
        <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
          Connect Instagram, accept bookings, deliver work, and track earnings.
        </Text>
        <PrimaryButton label="Continue as Creator" onPress={() => pickRole('influencer')} />
      </Card>
    </Screen>
  );
}
