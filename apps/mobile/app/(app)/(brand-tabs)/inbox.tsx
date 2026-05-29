import { ConversationRow } from '@/components/inbox/conversation-row';
import { InboxFilterSheet } from '@/components/inbox/inbox-filter-sheet';
import { GlassSearchField } from '@/components/ui/glass-search-field';
import { NativeIconButton } from '@/components/ui/native-icon-button';
import { ShimmerCircle, ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import {
  useBootstrap,
  useBusinessProfile,
  useInbox,
  useMarketplaceMutations,
} from '@/hooks/use-marketplace';
import { businessProfileImageUri } from '@/lib/brand/profile-image';
import {
  DEFAULT_INBOX_FILTERS,
  DEFAULT_INBOX_SORT,
  getVisibleInboxItems,
  inboxActiveFilterCount,
  type InboxFilterDraft,
  type InboxSort,
} from '@/lib/filters/inbox';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import { Ionicons } from '@expo/vector-icons';
import type { InboxItem } from '@plugoh/contracts';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

function EmptyInboxState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.emptyWrap}>
      <SymbolView
        name="bubble.left.and.bubble.right"
        size={52}
        tintColor="rgba(255,255,255,0.15)"
        type="monochrome"
        fallback={<Ionicons name="chatbubbles-outline" size={52} color="rgba(255,255,255,0.15)" />}
      />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

export default function BrandInboxScreen() {
  const insets = useSafeAreaInsets();
  const bootstrap = useBootstrap();
  const profile = useBusinessProfile();
  const inbox = useInbox();
  const mutations = useMarketplaceMutations();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<InboxFilterDraft>(DEFAULT_INBOX_FILTERS);
  const [sort, setSort] = useState<InboxSort>(DEFAULT_INBOX_SORT);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const profileImageUri = businessProfileImageUri(profile.data);
  const appliedFilterCount =
    inboxActiveFilterCount(filters) + (sort !== DEFAULT_INBOX_SORT ? 1 : 0);

  const filtered = useMemo(() => {
    return getVisibleInboxItems({
      items: inbox.data ?? [],
      query,
      filters,
      sort,
      matchesSearch: (item, q) => {
        const creatorName =
          item.campaign.influencer_profile?.display_name ??
          item.campaign.influencer_profile?.ig_username ??
          '';
        return (
          item.campaign.title.toLowerCase().includes(q) || creatorName.toLowerCase().includes(q)
        );
      },
    });
  }, [filters, inbox.data, query, sort]);

  const handleFilterPress = useCallback(() => {
    setFiltersVisible(true);
  }, []);

  const handleApplyFilters = useCallback(
    ({ filters: nextFilters, sort: nextSort }: { filters: InboxFilterDraft; sort: InboxSort }) => {
      setFilters(nextFilters);
      setSort(nextSort);
      setFiltersVisible(false);
    },
    [],
  );

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

  const renderItem = useCallback(
    ({ item, index }: { item: InboxItem; index: number }) => (
      <ConversationRow
        item={item}
        index={index}
        nameLabel={
          item.campaign.influencer_profile?.display_name ??
          item.campaign.influencer_profile?.ig_username ??
          null
        }
        avatarName={
          item.campaign.influencer_profile?.display_name ??
          item.campaign.influencer_profile?.ig_username ??
          null
        }
        avatarImageUri={
          item.campaign.influencer_profile?.profile_photo_url ??
          item.campaign.influencer_profile?.avatar_url ??
          null
        }
        onPress={() => {
          router.push(`/(app)/inbox/${item.campaign.id}`);
        }}
        onLongPress={() => {
          handleLongPress(item);
        }}
      />
    ),
    [handleLongPress],
  );

  const keyExtractor = useCallback((item: InboxItem) => item.campaign.id, []);
  const Separator = useCallback(() => <View style={styles.separator} />, []);
  const emptyTitle =
    query.trim().length > 0 || appliedFilterCount > 0
      ? 'No campaign threads match'
      : 'No campaign threads yet';
  const emptySubtitle =
    query.trim().length > 0 || appliedFilterCount > 0
      ? 'Try another search or filter option.'
      : 'Threads appear when a booking starts.';

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.headerBlock,
          {
            paddingTop: insets.top + theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.md,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Messages
          </Text>
          <NativeIconButton
            symbol="person.circle"
            fallbackIcon="person-circle-outline"
            variant="glass"
            haptic="light"
            size={44}
            symbolSize={20}
            imageUri={profileImageUri}
            glassRendering="blur"
            onPress={() => {
              router.push('/(app)/brand-profile');
            }}
          />
        </View>

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
              variant="glass"
              haptic="selection"
              size={46}
              symbolSize={21}
              fallbackSize={22}
              accessibilityLabel="Open filters"
              glassRendering="blur"
              onPress={handleFilterPress}
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
      ) : (
        <FlatList
          style={styles.list}
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={<EmptyInboxState title={emptyTitle} subtitle={emptySubtitle} />}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: Math.max(insets.bottom, theme.spacing.sm) + TAB_BAR_CLEARANCE,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <InboxFilterSheet
        visible={filtersVisible}
        presentation="premium"
        filters={filters}
        sort={sort}
        onCancel={() => {
          setFiltersVisible(false);
        }}
        onApply={handleApplyFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBlock: { gap: theme.spacing.md },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    minHeight: 48,
    paddingHorizontal: 2,
  },
  headerTitle: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: 0,
    color: theme.colors.foreground,
    flex: 1,
    minWidth: 0,
    includeFontPadding: false,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  searchFieldWrap: { flex: 1, minWidth: 0 },
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
    ...theme.typography.label,
    color: theme.colors.foreground,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  list: { flex: 1 },
  skeletonList: { flex: 1 },
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
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    ...theme.typography.section,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 20,
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.28)',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 240,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: 13,
    gap: 14,
  },
  skeletonBody: { flex: 1, gap: theme.spacing.xs },
});
