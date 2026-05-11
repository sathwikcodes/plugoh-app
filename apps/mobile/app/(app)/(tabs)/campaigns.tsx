import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Card, EmptyState, Screen, SectionTitle, StatusChip } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useCampaigns } from '@/hooks/use-marketplace';
import { useState } from 'react';

const filters = [
  { label: 'Requested', statuses: ['requested', 'payment_pending', 'pre_authorized'] },
  { label: 'Active', statuses: ['in_escrow', 'delivery_submitted', 'disputed'] },
  { label: 'Completed', statuses: ['completed'] },
  { label: 'Closed', statuses: ['declined', 'expired', 'cancelled', 'refunded'] },
] as const;

export default function CampaignsScreen() {
  const campaigns = useCampaigns();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]['label']>('Requested');

  const visible = (campaigns.data?.items ?? []).filter((item) => {
    const filter = filters.find((entry) => entry.label === activeFilter);
    const matchesFilter = filter
      ? (filter.statuses as readonly string[]).includes(item.status)
      : true;
    const searchText = search.toLowerCase();
    const matchesSearch =
      searchText.length === 0 ||
      item.title.toLowerCase().includes(searchText) ||
      item.business_profile?.brand_name?.toLowerCase().includes(searchText);
    return matchesFilter && matchesSearch;
  });

  return (
    <Screen>
      <SectionTitle
        title="Campaigns"
        subtitle="Track requests, funded work, delivery, and completion without losing context."
      />
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by campaign or brand"
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
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {filters.map((filter) => (
          <Pressable
            key={filter.label}
            onPress={() => {
              setActiveFilter(filter.label);
            }}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: theme.radius.chip,
              backgroundColor:
                activeFilter === filter.label ? theme.colors.accentSoft : theme.colors.surfaceWarm,
            }}
          >
            <Text
              style={{
                ...theme.typography.label,
                color:
                  activeFilter === filter.label ? theme.colors.accentStrong : theme.colors.muted,
              }}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {visible.length === 0 ? (
        <EmptyState
          title="No campaigns in this view"
          subtitle="Change the status filter or wait for a new request to land."
        />
      ) : (
        <FlashList
          data={visible}
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
                      {item.business_profile?.brand_name ?? 'Brand'}
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
