import { CampaignDeckSwiper } from '@/components/ui/campaign-deck-swiper';
import { GlassSearchField } from '@/components/ui/glass-search-field';
import { NativeIconButton } from '@/components/ui/native-icon-button';
import { Screen } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useCampaigns, useInfluencerProfile } from '@/hooks/use-marketplace';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Extra space so the swipe card stops short of the tab dock (card was extending too low). */
const DECK_BOTTOM_INSET = theme.spacing.xl + theme.spacing.sm;

/** Breathing room above the native tab bar (bar height varies; this stays clear of the dock). */
const TAB_BAR_CLEARANCE = 12;

export default function CampaignsScreen() {
  const insets = useSafeAreaInsets();
  const influencerProfile = useInfluencerProfile();
  const campaigns = useCampaigns({ sort: 'created_desc' });

  const [search, setSearch] = useState('');

  const allItems = campaigns.data?.items ?? [];
  const filtered = allItems.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      q.length === 0 ||
      item.title.toLowerCase().includes(q) ||
      item.business_profile?.brand_name?.toLowerCase().includes(q);
    return matchesSearch;
  });

  return (
    <Screen
      scrollEnabled={false}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + theme.spacing.lg,
        paddingBottom: Math.max(insets.bottom, theme.spacing.sm) + TAB_BAR_CLEARANCE,
        gap: theme.spacing.lg,
      }}
    >
      <View style={{ gap: theme.spacing.md }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing.md,
          }}
        >
          <Text
            style={{
              ...theme.typography.title,
              color: theme.colors.foreground,
              flex: 1,
              minWidth: 0,
            }}
            numberOfLines={1}
          >
            Campaigns
          </Text>
          <NativeIconButton
            symbol="person.circle"
            fallbackIcon="person-circle-outline"
            variant="glass"
            haptic="light"
            size={44}
            symbolSize={20}
            imageUri={influencerProfile.data?.profile_photo_url}
            onPress={() => {
              router.push('/(app)/profile');
            }}
          />
        </View>

        {/* Search + filter affordance */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <GlassSearchField
              value={search}
              onChangeText={setSearch}
              placeholder="Search campaigns or brands"
            />
          </View>
          <NativeIconButton
            symbol="line.3.horizontal.decrease.circle"
            fallbackIcon="options-outline"
            variant="glass"
            haptic="light"
            size={44}
            symbolSize={20}
            onPress={() => {}}
          />
        </View>
      </View>

      {/* Fill space below search; bottom inset keeps the card from running into the dock */}
      <View
        style={{
          flex: 1,
          minHeight: 0,
          marginTop: theme.spacing.sm,
          marginBottom: DECK_BOTTOM_INSET,
        }}
      >
        <CampaignDeckSwiper
          campaigns={filtered}
          isLoading={campaigns.isLoading}
          onRefresh={campaigns.refetch}
        />
      </View>
    </Screen>
  );
}
