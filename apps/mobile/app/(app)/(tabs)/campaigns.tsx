import { CampaignDeckSwiper } from '@/components/ui/campaign-deck-swiper';
import { GlassSearchField } from '@/components/ui/glass-search-field';
import { NativeIconButton } from '@/components/ui/native-icon-button';
import { Screen } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useCampaigns, useInfluencerProfile } from '@/hooks/use-marketplace';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** NativeTabs draws as an overlay, so this screen must reserve its visual dock height. */
const NATIVE_TAB_DOCK_HEIGHT = 72;
const TAB_DOCK_GAP = theme.spacing.lg;
const PAGE_HORIZONTAL_INSET = theme.spacing.lg;
const MAX_CARD_WIDTH = 390;
const CARD_VIEWPORT_RATIO = 0.84;
const DECK_FRAME_CLEARANCE = theme.spacing.section;

export default function CampaignsScreen() {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const influencerProfile = useInfluencerProfile();
  const campaigns = useCampaigns({ sort: 'created_desc' });

  const [search, setSearch] = useState('');
  const [deckSlotHeight, setDeckSlotHeight] = useState(0);

  const allItems = campaigns.data?.items ?? [];
  const filtered = allItems.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      q.length === 0 ||
      item.title.toLowerCase().includes(q) ||
      item.business_profile?.brand_name?.toLowerCase().includes(q);
    return matchesSearch;
  });

  const frame = useMemo(() => {
    const viewportWidth = window.width;
    const maxWidth = Math.min(viewportWidth * CARD_VIEWPORT_RATIO, MAX_CARD_WIDTH);
    const fallbackHeight = window.height * 0.58;
    const availableHeight =
      deckSlotHeight > 0 ? Math.max(0, deckSlotHeight - DECK_FRAME_CLEARANCE) : fallbackHeight;
    const cardHeight = Math.max(360, availableHeight);

    return {
      width: Math.max(260, Math.round(maxWidth)),
      height: Math.round(cardHeight),
      viewportWidth: Math.round(viewportWidth),
    };
  }, [deckSlotHeight, window.height, window.width]);

  function handleDeckLayout(event: LayoutChangeEvent) {
    setDeckSlotHeight(event.nativeEvent.layout.height);
  }

  return (
    <Screen
      scrollEnabled={false}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: PAGE_HORIZONTAL_INSET,
        paddingTop: insets.top + theme.spacing.lg,
        paddingBottom:
          Math.max(insets.bottom, theme.spacing.sm) + NATIVE_TAB_DOCK_HEIGHT + TAB_DOCK_GAP,
        gap: theme.spacing.md,
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

      {/* The measured slot keeps the card centered between search and the native tab dock. */}
      <View
        onLayout={handleDeckLayout}
        style={{
          flex: 1,
          minHeight: 0,
          marginHorizontal: -PAGE_HORIZONTAL_INSET,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CampaignDeckSwiper
          campaigns={filtered}
          isLoading={campaigns.isLoading}
          cardWidth={frame.width}
          cardHeight={frame.height}
          viewportWidth={frame.viewportWidth}
          onViewCampaign={(id) => {
            router.push(`/(app)/campaigns/${id}`);
          }}
        />
      </View>
    </Screen>
  );
}
