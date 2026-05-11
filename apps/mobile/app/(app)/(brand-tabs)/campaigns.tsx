import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Card, EmptyState, Screen, SectionTitle, StatusChip } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useCampaigns } from '@/hooks/use-marketplace';

export default function BrandCampaignsScreen() {
  const campaigns = useCampaigns({ sort: 'created_desc', limit: 50, offset: 0 });
  const rows = campaigns.data?.items ?? [];

  return (
    <Screen>
      <SectionTitle
        title="Campaigns"
        subtitle="Track request, escrow, delivery review, and completion."
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          subtitle="Start in Discover to create your first booking."
        />
      ) : (
        <FlashList
          data={rows}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                router.push(`/(app)/campaigns/${item.id}`);
              }}
            >
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ ...theme.typography.cardTitle, color: theme.colors.foreground }}>
                      {item.title}
                    </Text>
                    <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
                      {item.influencer_profile?.display_name ??
                        item.influencer_profile?.ig_username ??
                        'Creator'}
                    </Text>
                  </View>
                  <StatusChip label={item.status.replaceAll('_', ' ')} status={item.status} />
                </View>
                <Text style={{ ...theme.typography.mono, color: theme.colors.foreground }}>
                  ₹{Math.round(item.price_offered ?? 0).toLocaleString('en-IN')}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
