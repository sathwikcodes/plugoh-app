import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Card, EmptyState, Screen, SectionTitle, StatusChip } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useInbox } from '@/hooks/use-marketplace';

export default function BrandInboxScreen() {
  const inbox = useInbox();
  const rows = inbox.data ?? [];

  return (
    <Screen>
      <SectionTitle title="Inbox" subtitle="Handle campaign conversation and revision loops." />
      {rows.length === 0 ? (
        <EmptyState title="No campaign threads" subtitle="Threads appear once booking starts." />
      ) : (
        <FlashList
          data={rows}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                router.push(`/(app)/inbox/${item.campaign.id}`);
              }}
            >
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ ...theme.typography.cardTitle, color: theme.colors.foreground }}>
                      {item.campaign.title}
                    </Text>
                    <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
                      {item.latestMessage?.content ?? 'No messages yet'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 8 }}>
                    <StatusChip
                      label={item.campaign.status.replaceAll('_', ' ')}
                      status={item.campaign.status}
                    />
                    {item.unreadCount > 0 ? (
                      <Text style={{ ...theme.typography.label, color: theme.colors.accentStrong }}>
                        {item.unreadCount} unread
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
