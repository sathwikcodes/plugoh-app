import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Card, EmptyState, PrimaryButton, Screen, StatusChip } from '@/components/ui/primitives';
import { AsyncText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import { useBootstrap, useCampaigns, useNotifications } from '@/hooks/use-marketplace';
import { shouldShowInitialLoader } from '@/lib/query/loading';

export default function BrandHomeScreen() {
  const bootstrap = useBootstrap();
  const campaigns = useCampaigns();
  const notifications = useNotifications();
  const bootstrapLoading = shouldShowInitialLoader(bootstrap);
  const campaignsLoading = bootstrapLoading || shouldShowInitialLoader(campaigns);
  const notificationsLoading = bootstrapLoading || shouldShowInitialLoader(notifications);
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
      <View style={{ gap: theme.spacing.sm }}>
        <Text style={{ ...theme.typography.label, color: theme.colors.accentStrong }}>
          BRAND WORKSPACE
        </Text>
        <AsyncText
          loading={bootstrapLoading}
          value={
            bootstrap.data?.user.email ? `Hi, ${bootstrap.data.user.email.split('@')[0]}` : 'Hi'
          }
          style={{ ...theme.typography.section, color: theme.colors.foreground }}
          shimmerWidth="54%"
          shimmerHeight={24}
        />
        <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
          Discovery, booking, and escrow delivery health.
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>
            Active campaigns
          </Text>
          <AsyncText
            loading={campaignsLoading}
            value={active.length}
            style={{ ...theme.typography.title, color: theme.colors.foreground }}
            shimmerWidth="44%"
            shimmerHeight={30}
          />
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>
            Total campaigns
          </Text>
          <AsyncText
            loading={campaignsLoading}
            value={campaigns.data?.total ?? 0}
            style={{ ...theme.typography.title, color: theme.colors.foreground }}
            shimmerWidth="44%"
            shimmerHeight={30}
          />
        </Card>
      </View>
      {notificationsLoading ? (
        <Card>
          <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>
            Latest notification
          </Text>
          <AsyncText
            loading
            value={null}
            style={{ ...theme.typography.cardTitle, color: theme.colors.foreground }}
            shimmerWidth="68%"
            shimmerHeight={20}
          />
        </Card>
      ) : latestNotification ? (
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
