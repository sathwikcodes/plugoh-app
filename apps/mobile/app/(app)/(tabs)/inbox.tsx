import { ConversationRow } from '@/components/inbox/conversation-row';
import { InboxFilterSheet } from '@/components/inbox/inbox-filter-sheet';
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
import { shouldShowInitialLoader } from '@/lib/query/loading';
import { Ionicons } from '@expo/vector-icons';
import type { InboxItem } from '@plugoh/contracts';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Breathing room above the native tab bar — matches campaigns tab screen. */
const TAB_BAR_CLEARANCE = 12;

function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <ShimmerCircle size={44} />
      <View style={styles.skeletonBody}>
        <ShimmerText width="60%" height={14} />
        <ShimmerText width="35%" height={11} />
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

  const renderItem = useCallback(
    ({ item, index }: { item: InboxItem; index: number }) => (
      <ConversationRow
        item={item}
        index={index}
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
    query.trim().length > 0 || appliedFilterCount > 0 ? 'No messages match' : 'No messages yet';
  const emptySubtitle =
    query.trim().length > 0 || appliedFilterCount > 0
      ? 'Try another search or filter option.'
      : 'Your campaign conversations will appear here.';

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.headerBlock,
          {
            paddingTop: insets.top + theme.spacing.lg,
            paddingHorizontal: theme.spacing.xxl,
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
            imageUri={influencerProfile.data?.profile_photo_url}
            onPress={() => {
              router.push('/(app)/profile');
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
              fallbackIcon="options-outline"
              variant="glass"
              haptic="light"
              size={44}
              symbolSize={20}
              accessibilityLabel="Open filters"
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
  headerBlock: {
    gap: theme.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.title,
    color: theme.colors.foreground,
    flex: 1,
    minWidth: 0,
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
  },
  activeBadge: {
    position: 'absolute',
    right: -3,
    top: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: theme.colors.pink,
    borderWidth: 1,
    borderColor: theme.colors.background,
  },
  activeBadgeText: {
    ...theme.typography.label,
    color: theme.colors.background,
    fontSize: 10,
    lineHeight: 12,
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
    marginLeft: 76,
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
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: 14,
    gap: 12,
  },
  skeletonBody: {
    flex: 1,
    gap: theme.spacing.xs,
  },
});
