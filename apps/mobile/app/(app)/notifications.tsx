import { FlashList } from '@shopify/flash-list';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { Card, EmptyState, Screen, SectionTitle, StatusChip } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useMarketplaceMutations, useNotifications } from '@/hooks/use-marketplace';

export default function NotificationsScreen() {
  const notifications = useNotifications();
  const mutations = useMarketplaceMutations();

  useEffect(() => {
    if ((notifications.data ?? []).some((item) => !item.read)) {
      mutations.markNotificationsRead.mutate({ all: true });
    }
  }, [mutations.markNotificationsRead, notifications.data]);

  return (
    <Screen>
      <SectionTitle
        title="Notifications"
        subtitle="Urgent marketplace events are surfaced here first."
      />
      {(notifications.data ?? []).length === 0 ? (
        <EmptyState
          title="All clear"
          subtitle="Your next booking, message, or approval alert will appear here."
        />
      ) : (
        <FlashList
          data={notifications.data ?? []}
          renderItem={({ item }) => (
            <Card>
              <StatusChip label={item.type.replaceAll('_', ' ')} status={item.type} />
              <Text style={{ ...theme.typography.body, color: theme.colors.foreground }}>
                {(item.data as Record<string, string> | undefined)?.campaignTitle ??
                  'Marketplace update'}
              </Text>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
