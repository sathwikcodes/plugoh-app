import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Card, EmptyState, Screen, SectionTitle } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useInfluencerDiscovery } from '@/hooks/use-marketplace';

export default function BrandDiscoverScreen() {
  const [search, setSearch] = useState('');
  const discovery = useInfluencerDiscovery({
    search,
    sort: 'followers_desc',
    limit: 50,
    offset: 0,
  });

  return (
    <Screen>
      <SectionTitle
        title="Discover creators"
        subtitle="Search active creators and open booking details."
      />
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, handle, city"
        placeholderTextColor={theme.colors.muted}
        style={{
          minHeight: 50,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.card,
          paddingHorizontal: theme.spacing.lg,
          color: theme.colors.foreground,
        }}
      />
      {(discovery.data?.items ?? []).length === 0 ? (
        <EmptyState
          title="No creators found"
          subtitle="Refine search or wait for more creators to go live."
        />
      ) : (
        <FlashList
          data={discovery.data?.items ?? []}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                router.push(`/(app)/creator/${item.id}`);
              }}
            >
              <Card>
                <Text style={{ ...theme.typography.cardTitle, color: theme.colors.foreground }}>
                  {item.display_name ?? item.ig_username ?? 'Creator'}
                </Text>
                <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
                  {item.category ?? 'General'} · {item.city ?? 'Unknown city'}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ ...theme.typography.body, color: theme.colors.foreground }}>
                    Followers: {Math.round(item.follower_count ?? 0).toLocaleString('en-IN')}
                  </Text>
                  <Text style={{ ...theme.typography.mono, color: theme.colors.foreground }}>
                    From ₹{Math.round(item.starterPrice ?? 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
