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
import { useBootstrap, useCampaigns, useNotifications } from '@/hooks/use-marketplace';

export default function BrandHomeScreen() {
  const bootstrap = useBootstrap();
  const campaigns = useCampaigns();
  const notifications = useNotifications();
  const campaignItems = campaigns.data?.items ?? [];
  const active = campaignItems.filter((item) =>
    [
      'requested',
      'payment_pending',
      'pre_authorized',
      'in_escrow',
      'delivery_submitted',
      'disputed',
    ].includes(item.status),
  );
  const latestNotification = notifications.data?.[0];

  return (
    <Screen>
      <SectionTitle
        eyebrow="Brand workspace"
        title={`Hi${bootstrap.data?.user.email ? `, ${bootstrap.data.user.email.split('@')[0]}` : ''}`}
        subtitle="Discovery, booking, and escrow delivery health."
      />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>
            Active campaigns
          </Text>
          <Text style={{ ...theme.typography.title, color: theme.colors.foreground }}>
            {active.length}
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>
            Total campaigns
          </Text>
          <Text style={{ ...theme.typography.title, color: theme.colors.foreground }}>
            {campaigns.data?.total ?? 0}
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
            <StatusChip
              label={latestNotification.read ? 'Read' : 'Unread'}
              status={latestNotification.read ? 'completed' : 'pending'}
            />
          </Card>
        </Pressable>
      ) : (
        <EmptyState
          title="No notifications yet"
          subtitle="Booking and payment updates will surface here."
        />
      )}
      <PrimaryButton
        label="Discover creators"
        onPress={() => {
          router.push('/(app)/(brand-tabs)/discover');
        }}
      />
    </Screen>
  );
}
