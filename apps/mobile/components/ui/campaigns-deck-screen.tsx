import { theme } from '@/constants/theme';
import type { CampaignListItem } from '@plugoh/contracts';
import { router, type Href } from 'expo-router';
import { Alert, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CampaignDeckSwiper, type CampaignDeckRole } from './campaign-deck-swiper';
import { GlassSearchField } from './glass-search-field';
import { NativeIconButton } from './native-icon-button';
import { Screen } from './primitives';
import { useMemo, useState, type ComponentProps } from 'react';

export type CampaignSort = 'created_desc' | 'created_asc' | 'amount_desc' | 'amount_asc';

const NATIVE_TAB_DOCK_HEIGHT = 72;
const TAB_DOCK_GAP = theme.spacing.lg;
const PAGE_HORIZONTAL_INSET = theme.spacing.lg;
const MAX_CARD_WIDTH = 390;
const CARD_VIEWPORT_RATIO = 0.84;
const DECK_FRAME_CLEARANCE = theme.spacing.section;

const SORT_OPTIONS: { value: CampaignSort; label: string }[] = [
  { value: 'created_desc', label: 'Newest first' },
  { value: 'created_asc', label: 'Oldest first' },
  { value: 'amount_desc', label: 'Highest amount' },
  { value: 'amount_asc', label: 'Lowest amount' },
];

type Props = {
  role: CampaignDeckRole;
  campaigns: CampaignListItem[];
  isLoading: boolean;
  profileImageUri?: string | null;
  profileSymbol: ComponentProps<typeof NativeIconButton>['symbol'];
  profileFallbackIcon: ComponentProps<typeof NativeIconButton>['fallbackIcon'];
  profileRoute: Href;
  searchPlaceholder: string;
  searchMatcher: (campaign: CampaignListItem, query: string) => boolean;
  onOpenCampaign: (id: string) => void;
  onAcceptCampaign?: (id: string) => void;
  onDeclineCampaign?: (id: string) => void;
  acceptingCampaignId?: string;
  decliningCampaignId?: string;
};

function createdTime(item: CampaignListItem): number {
  const createdAt = item.created_at ? new Date(item.created_at).getTime() : 0;
  return Number.isNaN(createdAt) ? 0 : createdAt;
}

function campaignAmount(item: CampaignListItem): number {
  return item.price_offered ?? 0;
}

function sortCampaigns(items: CampaignListItem[], sort: CampaignSort): CampaignListItem[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case 'created_asc':
        return createdTime(a) - createdTime(b);
      case 'amount_desc':
        return campaignAmount(b) - campaignAmount(a);
      case 'amount_asc':
        return campaignAmount(a) - campaignAmount(b);
      case 'created_desc':
      default:
        return createdTime(b) - createdTime(a);
    }
  });
}

export function CampaignsDeckScreen({
  role,
  campaigns,
  isLoading,
  profileImageUri,
  profileSymbol,
  profileFallbackIcon,
  profileRoute,
  searchPlaceholder,
  searchMatcher,
  onOpenCampaign,
  onAcceptCampaign,
  onDeclineCampaign,
  acceptingCampaignId,
  decliningCampaignId,
}: Props) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<CampaignSort>('created_desc');
  const [deckSlotHeight, setDeckSlotHeight] = useState(0);

  const visibleCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered =
      q.length === 0 ? campaigns : campaigns.filter((item) => searchMatcher(item, q));
    return sortCampaigns(filtered, sort);
  }, [campaigns, search, searchMatcher, sort]);

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

  function handleSortPress() {
    Alert.alert(
      'Sort campaigns',
      undefined,
      [
        ...SORT_OPTIONS.map((option) => ({
          text: option.value === sort ? `${option.label} (selected)` : option.label,
          onPress: () => {
            setSort(option.value);
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
      { cancelable: true },
    );
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
            symbol={profileSymbol}
            fallbackIcon={profileFallbackIcon}
            variant="glass"
            haptic="light"
            size={44}
            symbolSize={20}
            imageUri={profileImageUri}
            onPress={() => {
              router.push(profileRoute);
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <GlassSearchField
              value={search}
              onChangeText={setSearch}
              placeholder={searchPlaceholder}
            />
          </View>
          <NativeIconButton
            symbol="line.3.horizontal.decrease.circle"
            fallbackIcon="options-outline"
            variant="glass"
            haptic="selection"
            size={44}
            symbolSize={20}
            onPress={handleSortPress}
          />
        </View>
      </View>

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
          role={role}
          campaigns={visibleCampaigns}
          isLoading={isLoading}
          cardWidth={frame.width}
          cardHeight={frame.height}
          viewportWidth={frame.viewportWidth}
          emptyTitle={campaigns.length === 0 ? 'No campaigns yet' : 'No campaigns match'}
          emptySubtitle={
            campaigns.length === 0
              ? role === 'business'
                ? 'Start in Find to discover creators and launch your first campaign.'
                : 'No new campaign requests right now. Pull down to check for updates.'
              : 'Try another search or sort option.'
          }
          onViewCampaign={onOpenCampaign}
          onAcceptCampaign={onAcceptCampaign}
          onDeclineCampaign={onDeclineCampaign}
          acceptingCampaignId={acceptingCampaignId}
          decliningCampaignId={decliningCampaignId}
        />
      </View>
    </Screen>
  );
}
