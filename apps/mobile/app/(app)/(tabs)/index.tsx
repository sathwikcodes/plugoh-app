import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import {
  Card,
  EmptyState,
  PrimaryButton,
  Screen,
  SectionTitle,
  StatusChip,
} from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useBootstrap, useCampaigns, useEarnings, useNotifications } from '@/hooks/use-marketplace';

export default function HomeScreen() {
  const bootstrap = useBootstrap();
  const campaigns = useCampaigns();
  const earnings = useEarnings();
  const notifications = useNotifications();

  const latestNotification = notifications.data?.[0];
  const campaignItems = campaigns.data?.items ?? [];
  const activeCampaigns = campaignItems.filter((item) =>
    [
      'requested',
      'payment_pending',
      'pre_authorized',
      'in_escrow',
      'delivery_submitted',
      'disputed',
    ].includes(item.status),
  );

  return (
    <Screen>
      <SectionTitle
        eyebrow="Creator workspace"
        title={`Hi${bootstrap.data?.user.email ? `, ${bootstrap.data.user.email.split('@')[0]}` : ''}`}
        subtitle="Your campaign operations snapshot for today."
      />
      <Card style={{ backgroundColor: theme.colors.surfaceBlush }}>
        <Text style={{ ...theme.typography.label, color: theme.colors.accentStrong }}>
          Profile readiness
        </Text>
        <Text style={{ ...theme.typography.section, color: theme.colors.foreground }}>
          {bootstrap.data?.onboardingStage === 'ready' ? 'Ready for brands' : 'Needs attention'}
        </Text>
        <StatusChip
          label={bootstrap.data?.onboardingStage === 'ready' ? 'Live' : 'Setup'}
          status={bootstrap.data?.onboardingStage}
        />
      </Card>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>
            Active campaigns
          </Text>
          <Text style={{ ...theme.typography.title, color: theme.colors.foreground }}>
            {activeCampaigns.length}
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>
            Pending earnings
          </Text>
          <Text style={{ ...theme.typography.title, color: theme.colors.foreground }}>
            ₹{Math.round(earnings.data?.pending_earnings ?? 0).toLocaleString('en-IN')}
          </Text>
        </Card>
      </View>
      {latestNotification ? (
        <Pressable
          onPress={() => {
            router.push('/(app)/notifications');
          }}
        >
          <Card>
            <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>
              Latest notification
            </Text>
            <Text style={{ ...theme.typography.cardTitle, color: theme.colors.foreground }}>
              {latestNotification.type.replaceAll('_', ' ')}
            </Text>
            <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
              Open notifications to act on the latest marketplace update.
            </Text>
          </Card>
        </Pressable>
      ) : (
        <EmptyState
          title="No notifications yet"
          subtitle="New bookings, disputes, and payment updates will appear here first."
        />
      )}
      <PrimaryButton
        label="View campaigns"
        onPress={() => {
          router.push('/(app)/(tabs)/campaigns');
        }}
      />
    </Screen>
  );
}
