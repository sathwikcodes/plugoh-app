import { DateSeparator } from '@/components/inbox/date-separator';
import { MessageBubble } from '@/components/inbox/message-bubble';
import { GlassCircleButton } from '@/components/ui/glass-circle-button';
import { theme } from '@/constants/theme';
import { useCampaign, useMarketplaceMutations, useMessages } from '@/hooks/use-marketplace';
import { useAuthStore } from '@/store/auth';
import { Ionicons } from '@expo/vector-icons';
import type { CampaignMessage } from '@plugoh/contracts';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CHAT_ENABLED_STATUSES = ['in_escrow', 'delivery_submitted', 'completed', 'disputed'];

/** Identity pill header — avatar + name */
const IDENTITY_AVATAR_SIZE = 24;
const IDENTITY_AVATAR_RADIUS = IDENTITY_AVATAR_SIZE / 2;
const IDENTITY_PILL_MIN_HEIGHT = 40;
/** Full capsule ends (half height) — avatar is floated so it is not clipped by `overflow: 'hidden'`. */
const IDENTITY_PILL_CORNER_RADIUS = IDENTITY_PILL_MIN_HEIGHT / 2;
/** Small gap from the pill’s left edge to the avatar (avatar is `position: 'absolute'`, not padded inside the clip). */
const IDENTITY_AVATAR_FLOAT_LEFT = theme.spacing.sm + 2;
/** In-glass spacer so the label clears the floating avatar + gap */
const IDENTITY_NAME_LEADING_RESERVE =
  IDENTITY_AVATAR_FLOAT_LEFT + IDENTITY_AVATAR_SIZE + theme.spacing.sm;

type ListItem =
  | { kind: 'message'; data: CampaignMessage; key: string }
  | { kind: 'separator'; date: string; key: string };

function buildListItems(msgs: CampaignMessage[]): ListItem[] {
  // msgs from API are oldest-first; we reverse for inverted FlashList
  const oldest = [...msgs]; // oldest first
  const result: ListItem[] = [];
  let lastDateStr = '';

  for (const msg of oldest) {
    const dateStr = new Date(msg.created_at).toDateString();
    if (dateStr !== lastDateStr) {
      result.push({ kind: 'separator', date: msg.created_at, key: `sep-${msg.id}` });
      lastDateStr = dateStr;
    }
    result.push({ kind: 'message', data: msg, key: msg.id });
  }

  return result.reverse(); // newest first → inverted list shows newest at bottom
}

function initials(name?: string | null): string {
  if (!name?.trim()) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

function LiquidGlassShell({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const shell: StyleProp<ViewStyle> = [
    {
      borderRadius: 24,
      overflow: 'hidden' as const,
      borderCurve: 'continuous' as const,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    style,
  ];
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="dark" style={shell}>
        {children}
      </GlassView>
    );
  }
  return (
    <BlurView tint="systemUltraThinMaterialDark" intensity={88} style={shell}>
      {children}
    </BlurView>
  );
}

function ChatDisabledBanner() {
  return (
    <LiquidGlassShell style={styles.disabledBannerShell}>
      <View style={styles.disabledBannerInner}>
        <View style={styles.disabledIconWrap}>
          <SymbolView
            name="lock.fill"
            size={18}
            tintColor="rgba(255,255,255,0.55)"
            type="monochrome"
            fallback={<Ionicons name="lock-closed" size={18} color="rgba(255,255,255,0.55)" />}
          />
        </View>
        <View style={styles.disabledTextCol}>
          <Text style={styles.disabledTitle}>Chat is locked</Text>
          <Text style={styles.disabledSubtitle}>
            The campaign must be active before you can send messages here.
          </Text>
        </View>
      </View>
    </LiquidGlassShell>
  );
}

/** Inverted FlatList flips cells; flip back so empty / loading reads upright. */
function InvertedListCenter({ children }: { children: ReactNode }) {
  return <View style={styles.invertedListCenter}>{children}</View>;
}

function ThreadMessagesSkeleton() {
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.65, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [opacity]);

  return (
    <InvertedListCenter>
      <LiquidGlassShell style={styles.emptyStateShell}>
        <View style={styles.emptyStateInner}>
          <Animated.View style={[styles.skeletonPulseWrap, { opacity }]}>
            <View style={styles.skeletonBarWide} />
            <View style={[styles.skeletonBarMid, { marginTop: theme.spacing.sm }]} />
            <View style={[styles.skeletonBarNarrow, { marginTop: theme.spacing.sm }]} />
          </Animated.View>
          <ActivityIndicator
            color="rgba(255,255,255,0.35)"
            style={{ marginTop: theme.spacing.lg }}
          />
          <Text style={styles.emptyStateCaption}>Loading messages…</Text>
        </View>
      </LiquidGlassShell>
    </InvertedListCenter>
  );
}

function EmptyMessagesPlaceholder() {
  return (
    <InvertedListCenter>
      <LiquidGlassShell style={styles.emptyStateShell}>
        <View style={styles.emptyStateInner}>
          <SymbolView
            name="bubble.left.and.bubble.right"
            size={36}
            tintColor="rgba(255,255,255,0.22)"
            type="monochrome"
            fallback={
              <Ionicons name="chatbubbles-outline" size={36} color="rgba(255,255,255,0.22)" />
            }
          />
          <Text style={styles.emptyStateTitle}>No messages here yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            When the chat is open, new messages will show up in this thread.
          </Text>
        </View>
      </LiquidGlassShell>
    </InvertedListCenter>
  );
}

type ComposeBarProps = {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  onAttachment: () => void;
  isSending: boolean;
  bottomInset: number;
};

function ComposeBar({
  value,
  onChangeText,
  onSend,
  onAttachment,
  isSending,
  bottomInset,
}: ComposeBarProps) {
  const canSend = value.trim().length > 0 && !isSending;

  return (
    <View style={[styles.compose, { paddingBottom: Math.max(bottomInset, 10) }]}>
      <GlassCircleButton
        symbol="paperclip"
        fallbackIcon="attach"
        onPress={onAttachment}
        size={40}
        symbolSize={18}
        accessibilityLabel="Attach file"
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Message…"
        placeholderTextColor="rgba(255,255,255,0.30)"
        multiline
        style={styles.input}
        returnKeyType="default"
        maxLength={4000}
      />
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        accessibilityLabel="Send message"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={
            canSend
              ? ['#FF3CAC', theme.colors.rose]
              : [theme.colors.surface, theme.colors.surfaceWarm]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sendButton}
        >
          <SymbolView
            name="arrow.up"
            size={16}
            tintColor={canSend ? '#FFFFFF' : 'rgba(255,255,255,0.25)'}
            type="monochrome"
            fallback={
              <Ionicons
                name="arrow-up"
                size={16}
                color={canSend ? '#FFFFFF' : 'rgba(255,255,255,0.25)'}
              />
            }
          />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export default function InboxThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const myId = session?.user.id ?? '';

  const [draft, setDraft] = useState('');
  const [floatingHeaderHeight, setFloatingHeaderHeight] = useState(() => insets.top + 54);

  const campaign = useCampaign(id);
  const messages = useMessages(id);
  const mutations = useMarketplaceMutations();

  const chatEnabled = CHAT_ENABLED_STATUSES.includes(campaign.data?.status ?? '');

  // Mark as read when screen focuses
  useFocusEffect(
    useCallback(() => {
      if (id) mutations.markMessagesRead.mutate(id);
    }, [id, mutations.markMessagesRead]),
  );

  const listItems = useMemo(() => buildListItems(messages.data ?? []), [messages.data]);

  const brandName = campaign.data?.business_profile?.brand_name;
  const headerDisplayName = brandName?.trim() || campaign.data?.title.trim() || 'Chat';
  const headerInitialsSource = brandName?.trim() || campaign.data?.title;

  const identityNameMaxWidth = useMemo(() => {
    const rowInner = windowWidth - theme.spacing.lg * 2;
    const gapSm = theme.spacing.sm;
    const headerIcon = 38;
    const startWidth = rowInner - gapSm - headerIcon;
    const pillMax = Math.min(rowInner * 0.5, startWidth - headerIcon - gapSm);
    const pillPadRight = theme.spacing.md;
    return Math.max(72, pillMax - IDENTITY_NAME_LEADING_RESERVE - pillPadRight);
  }, [windowWidth]);

  const listEmpty = useMemo(() => {
    if (messages.isPending) {
      return <ThreadMessagesSkeleton />;
    }
    if ((messages.data?.length ?? 0) === 0) {
      return <EmptyMessagesPlaceholder />;
    }
    return null;
  }, [messages.isPending, messages.data]);

  // Find the other user ID for read receipts
  const otherUserId = useMemo(() => {
    const msgs = messages.data ?? [];
    return msgs.find((m) => m.sender_id !== myId)?.sender_id ?? null;
  }, [messages.data, myId]);

  // ID of the last own message
  const lastOwnMessageId = useMemo(() => {
    const msgs = messages.data ?? [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].sender_id === myId) return msgs[i].id;
    }
    return null;
  }, [messages.data, myId]);

  // Whether the last own message has been read by the other user
  const lastOwnIsRead = useMemo(() => {
    if (!lastOwnMessageId || !otherUserId) return false;
    const msg = (messages.data ?? []).find((m) => m.id === lastOwnMessageId);
    return (msg?.read_by ?? []).includes(otherUserId);
  }, [messages.data, lastOwnMessageId, otherUserId]);

  const handleSend = useCallback(async () => {
    if (!draft.trim()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await mutations.sendMessage.mutateAsync({ id, content: draft.trim() });
      setDraft('');
    } catch (error) {
      Alert.alert('Could not send', error instanceof Error ? error.message : 'Try again.');
    }
  }, [draft, id, mutations.sendMessage]);

  const handleAttachment = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled) return;
    const file = result.assets[0];
    try {
      await mutations.sendAttachment.mutateAsync({
        id,
        caption: draft.trim() || undefined,
        file: { uri: file.uri, name: file.name, mimeType: file.mimeType ?? undefined },
      });
      setDraft('');
    } catch (error) {
      Alert.alert(
        'Could not send attachment',
        error instanceof Error ? error.message : 'Try again.',
      );
    }
  }, [draft, id, mutations.sendAttachment]);

  const handleThreadInfo = useCallback(() => {
    void Haptics.selectionAsync();
    const title = campaign.data?.title.trim() || 'Campaign';
    const brand = campaign.data?.business_profile?.brand_name?.trim();
    const status = campaign.data?.status.replace(/_/g, ' ') ?? '…';
    const lines = [brand ? `Brand: ${brand}` : null, `Status: ${status}`].filter(Boolean);
    Alert.alert(title, lines.join('\n'));
  }, [campaign.data]);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.kind === 'separator') {
        return <DateSeparator date={item.date} />;
      }
      const msg = item.data;
      const isOwn = msg.sender_id === myId;
      const showSeenReceipt = isOwn && msg.id === lastOwnMessageId && lastOwnIsRead;
      return <MessageBubble message={msg} isOwn={isOwn} showSeenReceipt={showSeenReceipt} />;
    },
    [myId, lastOwnMessageId, lastOwnIsRead],
  );

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={floatingHeaderHeight}
      >
        <FlatList
          data={listItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          inverted
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: floatingHeaderHeight + theme.spacing.xs },
            listItems.length === 0 ? styles.listContentEmpty : null,
          ]}
          ListEmptyComponent={listEmpty}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {chatEnabled ? (
          <ComposeBar
            value={draft}
            onChangeText={setDraft}
            onSend={handleSend}
            onAttachment={handleAttachment}
            isSending={mutations.sendMessage.isPending || mutations.sendAttachment.isPending}
            bottomInset={insets.bottom}
          />
        ) : (
          <View
            style={[
              styles.disabledBannerOuter,
              { paddingBottom: Math.max(insets.bottom, theme.spacing.md) },
            ]}
          >
            <ChatDisabledBanner />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Floating glass controls — no full-width header bar */}
      <View
        pointerEvents="box-none"
        style={styles.floatingHeader}
        onLayout={(e) => {
          setFloatingHeaderHeight(e.nativeEvent.layout.height);
        }}
      >
        <View style={[styles.floatingHeaderRow, { paddingTop: insets.top + theme.spacing.sm }]}>
          <View style={styles.floatingHeaderStart}>
            <View style={styles.floatingShadow}>
              <GlassCircleButton
                symbol="chevron.left"
                fallbackIcon="chevron-back"
                tintColor="#FFFFFF"
                size={38}
                symbolSize={17}
                accessibilityLabel="Go back"
                onPress={() => {
                  router.back();
                }}
              />
            </View>

            <View style={[styles.floatingShadow, styles.identityPillShadow]}>
              <View style={styles.identityPillOuter}>
                <LiquidGlassShell style={styles.identityPillShell}>
                  <View style={styles.identityPillInner}>
                    <View style={styles.identityNameLeadingSpacer} />
                    <View style={styles.identityNameWrap}>
                      <Text
                        style={[styles.identityName, { maxWidth: identityNameMaxWidth }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {campaign.isPending ? '…' : headerDisplayName}
                      </Text>
                    </View>
                  </View>
                </LiquidGlassShell>
                <View
                  style={[styles.identityAvatar, styles.identityAvatarFloating]}
                  pointerEvents="none"
                >
                  <LinearGradient
                    colors={['#FF3CAC', theme.colors.rose]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFillObject, styles.identityAvatarGradient]}
                  />
                  <Text style={styles.identityAvatarInitials}>
                    {initials(headerInitialsSource)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.floatingShadow}>
            <GlassCircleButton
              symbol="info.circle"
              fallbackIcon="information-circle"
              tintColor="#FFFFFF"
              size={38}
              symbolSize={18}
              accessibilityLabel="Thread info"
              onPress={handleThreadInfo}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  floatingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  floatingHeaderStart: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  floatingShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      },
      default: {
        elevation: 8,
      },
    }),
  },
  identityPillShadow: {
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: '50%',
    alignSelf: 'flex-start',
  },
  identityPillOuter: {
    position: 'relative',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  identityPillShell: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderRadius: IDENTITY_PILL_CORNER_RADIUS,
    minHeight: IDENTITY_PILL_MIN_HEIGHT,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        borderCurve: 'circular' as const,
      },
      default: {},
    }),
  },
  identityPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    minHeight: IDENTITY_PILL_MIN_HEIGHT,
    maxWidth: '100%',
  },
  identityNameLeadingSpacer: {
    width: IDENTITY_NAME_LEADING_RESERVE,
    flexShrink: 0,
  },
  identityAvatar: {
    width: IDENTITY_AVATAR_SIZE,
    height: IDENTITY_AVATAR_SIZE,
    borderRadius: IDENTITY_AVATAR_RADIUS,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
    ...Platform.select({
      ios: {
        borderCurve: 'circular' as const,
      },
      default: {},
    }),
  },
  identityAvatarFloating: {
    position: 'absolute',
    left: IDENTITY_AVATAR_FLOAT_LEFT,
    top: '50%',
    marginTop: -IDENTITY_AVATAR_RADIUS,
    zIndex: 2,
  },
  identityAvatarGradient: {
    borderRadius: IDENTITY_AVATAR_RADIUS,
  },
  identityAvatarInitials: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    zIndex: 1,
  },
  identityNameWrap: {
    flexShrink: 1,
    justifyContent: 'center',
  },
  identityName: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    flexShrink: 1,
    letterSpacing: 0.15,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  body: {
    flex: 1,
  },
  listContent: {
    paddingVertical: theme.spacing.md,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  invertedListCenter: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    transform: [{ scaleY: -1 }],
  },
  emptyStateShell: {
    maxWidth: 340,
    width: '100%',
  },
  emptyStateInner: {
    alignItems: 'center',
    paddingVertical: theme.spacing.hero,
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  skeletonPulseWrap: {
    width: '100%',
    alignItems: 'center',
  },
  emptyStateTitle: {
    ...theme.typography.section,
    color: 'rgba(255,255,255,0.52)',
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.32)',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyStateCaption: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.28)',
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  skeletonBarWide: {
    height: 10,
    width: '88%',
    maxWidth: 260,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  skeletonBarMid: {
    height: 10,
    width: '62%',
    maxWidth: 200,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skeletonBarNarrow: {
    height: 10,
    width: '42%',
    maxWidth: 140,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  compose: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.10)',
    backgroundColor: theme.colors.background,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    color: theme.colors.foreground,
    ...theme.typography.body,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBannerOuter: {
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  disabledBannerShell: {
    marginHorizontal: theme.spacing.md,
  },
  disabledBannerInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.xxl,
  },
  disabledIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  disabledTextCol: {
    flex: 1,
    gap: theme.spacing.sm,
    minWidth: 0,
  },
  disabledTitle: {
    ...theme.typography.cardTitle,
    color: 'rgba(255,255,255,0.88)',
  },
  disabledSubtitle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.42)',
    lineHeight: 22,
  },
});
