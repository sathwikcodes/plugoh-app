import { ConversationRow } from '@/components/inbox/conversation-row';
import { GlassSearchField } from '@/components/ui/glass-search-field';
import { NativeIconButton } from '@/components/ui/native-icon-button';
import { theme } from '@/constants/theme';
import { useInbox, useMarketplaceMutations } from '@/hooks/use-marketplace';
import { Ionicons } from '@expo/vector-icons';
import type { InboxItem } from '@plugoh/contracts';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Animated, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_BAR_CLEARANCE = 12;

type InboxFilter = 'all' | 'unread';

function SkeletonRow() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useMemo(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.skeletonRow, { opacity }]}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonBody}>
        <View style={[styles.skeletonLine, { width: '60%', height: 14 }]} />
        <View style={[styles.skeletonLine, { width: '35%', height: 11, marginTop: 5 }]} />
        <View style={[styles.skeletonLine, { width: '80%', height: 11, marginTop: 4 }]} />
      </View>
    </Animated.View>
  );
}

function EmptyInboxState() {
  return (
    <View style={styles.emptyWrap}>
      <SymbolView
        name="bubble.left.and.bubble.right"
        size={52}
        tintColor="rgba(255,255,255,0.15)"
        type="monochrome"
        fallback={<Ionicons name="chatbubbles-outline" size={52} color="rgba(255,255,255,0.15)" />}
      />
      <Text style={styles.emptyTitle}>No campaign threads yet</Text>
      <Text style={styles.emptySubtitle}>Threads appear when a booking starts.</Text>
    </View>
  );
}

export default function BrandInboxScreen() {
  const insets = useSafeAreaInsets();
  const inbox = useInbox();
  const mutations = useMarketplaceMutations();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');

  const filtered = useMemo(() => {
    const items = inbox.data ?? [];
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const creatorName =
        item.campaign.influencer_profile?.display_name ??
        item.campaign.influencer_profile?.ig_username ??
        '';
      const matchesSearch =
        q.length === 0 ||
        item.campaign.title.toLowerCase().includes(q) ||
        creatorName.toLowerCase().includes(q);
      const matchesFilter = filter === 'all' || item.unreadCount > 0;
      return matchesSearch && matchesFilter;
    });
  }, [inbox.data, query, filter]);

  const handleFilterPress = useCallback(() => {
    Alert.alert('Filter', undefined, [
      {
        text: 'All conversations',
        onPress: () => {
          setFilter('all');
        },
      },
      {
        text: 'Unread only',
        onPress: () => {
          setFilter('unread');
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);

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
            symbol="storefront"
            fallbackIcon="storefront-outline"
            variant="glass"
            haptic="light"
            size={44}
            symbolSize={20}
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
          <NativeIconButton
            symbol="line.3.horizontal.decrease.circle"
            fallbackIcon="options-outline"
            variant="glass"
            haptic="light"
            size={44}
            symbolSize={20}
            onPress={handleFilterPress}
          />
        </View>
      </View>

      {inbox.isLoading ? (
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
          ListEmptyComponent={EmptyInboxState}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: Math.max(insets.bottom, theme.spacing.sm) + TAB_BAR_CLEARANCE,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
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
  searchFieldWrap: { flex: 1, minWidth: 0 },
  list: { flex: 1 },
  skeletonList: { flex: 1 },
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
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  skeletonBody: { flex: 1 },
  skeletonLine: {
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
