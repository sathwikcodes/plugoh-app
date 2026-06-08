import { ConversationRow } from '@/components/inbox/conversation-row';
import { InboxFilterSheet } from '@/components/inbox/inbox-filter-sheet';
import { AppHeader, getAppHeaderShellTopPadding } from '@/components/ui/app-header';
import { GlassSearchField } from '@/components/ui/glass-search-field';
import { NativeIconButton } from '@/components/ui/native-icon-button';
import { ShimmerCircle, ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import {
  useBootstrap,
  useInbox,
  useInfluencerProfile,
  useMarketplaceMutations,
} from '@/hooks/use-marketplace';
import {
  DEFAULT_INBOX_FILTERS,
  DEFAULT_INBOX_SORT,
  getVisibleInboxItems,
  inboxActiveFilterCount,
  type InboxFilterDraft,
  type InboxSort,
} from '@/lib/filters/inbox';
import { getConversationParty } from '@/lib/inbox/conversation-display';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import labImage from '@/assets/images/lab.png';
import type { InboxItem } from '@plugoh/contracts';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Breathing room above the native tab bar — matches campaigns tab screen. */
const TAB_BAR_CLEARANCE = 12;

function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <ShimmerCircle size={56} />
      <View style={styles.skeletonBody}>
        <ShimmerText width="64%" height={16} />
        <ShimmerText width="46%" height={12} />
        <ShimmerText width="80%" height={11} />
      </View>
    </View>
  );
}

function EmptyInboxState({ title }: { title: string }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyCopy}>
        <Text style={styles.emptyTitle}>{title}</Text>
      </View>
    </View>
  );
}

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const bootstrap = useBootstrap();
  const inbox = useInbox();
  const mutations = useMarketplaceMutations();
  const influencerProfile = useInfluencerProfile();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<InboxFilterDraft>(DEFAULT_INBOX_FILTERS);
  const [sort, setSort] = useState<InboxSort>(DEFAULT_INBOX_SORT);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const appliedFilterCount =
    inboxActiveFilterCount(filters) + (sort !== DEFAULT_INBOX_SORT ? 1 : 0);

  const filtered = useMemo(() => {
    return getVisibleInboxItems({
      items: inbox.data ?? [],
      query,
      filters,
      sort,
      matchesSearch: (item, q) =>
        item.campaign.title.toLowerCase().includes(q) ||
        Boolean(item.campaign.business_profile?.brand_name?.toLowerCase().includes(q)),
    });
  }, [filters, inbox.data, query, sort]);

  const handleLongPress = useCallback(
    (item: InboxItem) => {
      Alert.alert(item.campaign.title, undefined, [
        {
          text: 'Mark as read',
          onPress: () => {
            mutations.markMessagesRead.mutate(item.campaign.id);
          },
        },
        {
          text: 'View Campaign',
          onPress: () => {
            router.push(`/(app)/campaigns/${item.campaign.id}`);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [mutations.markMessagesRead],
  );

  const handlePress = useCallback((item: InboxItem) => {
    router.push(`/(app)/inbox/${item.campaign.id}`);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: InboxItem; index: number }) => {
      const party = getConversationParty(item.campaign, 'influencer');
      return (
        <ConversationRow
          item={item}
          index={index}
          nameLabel={party.name}
          avatarName={party.avatarName}
          avatarImageUri={party.avatarUri}
          onPress={handlePress}
          onLongPress={handleLongPress}
        />
      );
    },
    [handlePress, handleLongPress],
  );

  const keyExtractor = useCallback((item: InboxItem) => item.campaign.id, []);

  const Separator = useCallback(() => <View style={styles.separator} />, []);

  const listContentStyle = useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, theme.spacing.sm) + TAB_BAR_CLEARANCE }),
    [insets.bottom],
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.topHeader,
          {
            paddingTop: getAppHeaderShellTopPadding(insets.top),
            paddingHorizontal: theme.spacing.xxl,
          },
        ]}
      >
        <AppHeader
          title="Messages"
          profile={{
            imageUri: influencerProfile.data?.profile_photo_url,
            onPress: () => {
              router.push('/(app)/profile');
            },
          }}
        />
      </View>

      <View style={styles.searchBlock}>
        <View style={styles.searchRow}>
          <View style={styles.searchFieldWrap}>
            <GlassSearchField
              value={query}
              onChangeText={setQuery}
              placeholder="Search conversations"
            />
          </View>
          <View style={styles.filterButtonWrap}>
            <NativeIconButton
              symbol="line.3.horizontal.decrease.circle"
              fallbackIcon="filter"
              fallbackIconFamily="foundation"
              preferFallbackIcon
              imageSource={labImage}
              imageSize={30}
              variant="glass"
              haptic="selection"
              size={46}
              symbolSize={21}
              fallbackSize={22}
              accessibilityLabel="Open filters"
              glassRendering="blur"
              onPress={() => {
                setFiltersVisible(true);
              }}
            />
            {appliedFilterCount > 0 ? (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>{appliedFilterCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {shouldShowInitialLoader(bootstrap) || shouldShowInitialLoader(inbox) ? (
        <View style={styles.skeletonList}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <EmptyInboxState title="No messages yet" />
      ) : (
        <View style={styles.list}>
          <FlashList
            data={filtered}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ItemSeparatorComponent={Separator}
            contentContainerStyle={listContentStyle}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      <InboxFilterSheet
        visible={filtersVisible}
        presentation="premium"
        filters={filters}
        sort={sort}
        onCancel={() => {
          setFiltersVisible(false);
        }}
        onApply={({ filters: nextFilters, sort: nextSort }) => {
          setFilters(nextFilters);
          setSort(nextSort);
          setFiltersVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topHeader: {
    flexShrink: 0,
  },
  searchBlock: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  searchFieldWrap: {
    flex: 1,
    minWidth: 0,
  },
  filterButtonWrap: {
    position: 'relative',
    width: 46,
    height: 46,
  },
  activeBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    backgroundColor: '#FF453A',
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.34,
    shadowRadius: 8,
    elevation: 6,
  },
  activeBadgeText: {
    ...theme.typography.labelSmall,
    color: theme.colors.foreground,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  list: {
    flex: 1,
  },
  skeletonList: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginLeft: 90,
    marginRight: 20,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxl,
  },
  emptyCopy: {
    alignItems: 'center',
  },
  emptyTitle: {
    ...theme.typography.section,
    color: theme.colors.foreground,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.58)',
    textAlign: 'center',
    maxWidth: 260,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: 13,
    gap: 14,
  },
  skeletonBody: {
    flex: 1,
    gap: theme.spacing.xs,
  },
});
