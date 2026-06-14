import { ChatDisabledBanner } from '@/components/inbox/chat-disabled-banner';
import { ChatThreadHeader } from '@/components/inbox/chat-thread-header';
import { ComposeBar } from '@/components/inbox/compose-bar';
import { DateSeparator } from '@/components/inbox/date-separator';
import { MessageBubble } from '@/components/inbox/message-bubble';
import { EmptyMessagesPlaceholder, ThreadMessagesSkeleton } from '@/components/inbox/thread-states';
import { theme } from '@/constants/theme';
import {
  useBootstrap,
  useCampaign,
  useMarketplaceMutations,
  useThreadMessages,
} from '@/hooks/use-marketplace';
import { useReadReceipt } from '@/hooks/use-read-receipt';
import { buildListItems, getMessageGroupFlags, type ListItem } from '@/lib/inbox/build-list-items';
import { getConversationParty } from '@/lib/inbox/conversation-display';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import { useAuthStore } from '@/store/auth';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CHAT_ENABLED_STATUSES = ['in_escrow', 'delivery_submitted', 'completed', 'disputed'];

export default function InboxThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const myId = useAuthStore((s) => s.session?.user.id) ?? '';

  const [draft, setDraft] = useState('');
  const [headerHeight, setHeaderHeight] = useState(() => insets.top + 54);

  const bootstrap = useBootstrap();
  const campaign = useCampaign(id);
  const thread = useThreadMessages(id);
  const mutations = useMarketplaceMutations();

  const campaignLoading = shouldShowInitialLoader(bootstrap) || shouldShowInitialLoader(campaign);
  const messagesLoading = shouldShowInitialLoader(thread);
  const viewerRole = bootstrap.data?.role === 'business' ? 'business' : 'influencer';
  const chatEnabled = CHAT_ENABLED_STATUSES.includes(campaign.data?.status ?? '');

  // Mark as read when the thread is focused (server-side no-op once fully read).
  useFocusEffect(
    useCallback(() => {
      if (id) mutations.markMessagesRead.mutate(id);
    }, [id, mutations.markMessagesRead]),
  );

  const listItems = useMemo(() => buildListItems(thread.messages), [thread.messages]);
  const { lastOwnMessageId, lastOwnIsRead } = useReadReceipt(thread.messages, myId);

  const party = campaign.data ? getConversationParty(campaign.data, viewerRole) : null;
  const headerDisplayName = party?.name || campaign.data?.title.trim() || 'Chat';
  const headerInitialsSource = party?.name ?? campaign.data?.title ?? null;
  const headerAvatarUri = party?.avatarUri ?? null;

  const handleSend = useCallback(async () => {
    if (!draft.trim()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const content = draft.trim();
    setDraft('');
    try {
      await mutations.sendMessage.mutateAsync({ id, content });
    } catch (error) {
      setDraft(content);
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
    const status = campaign.data?.status.replace(/_/g, ' ') ?? '…';
    const participantLine = party?.name
      ? `${viewerRole === 'business' ? 'Creator' : 'Brand'}: ${party.name}`
      : null;
    const lines = [participantLine, `Status: ${status}`].filter(Boolean);
    Alert.alert(title, lines.join('\n'));
  }, [campaign.data?.status, campaign.data?.title, party?.name, viewerRole]);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = thread;
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item, index }: { item: ListItem; index: number }) => {
      if (item.kind === 'separator') return <DateSeparator date={item.date} />;
      const msg = item.data;
      const isOwn = msg.sender_id === myId;

      // System / booking events render as standalone centered pills.
      if (msg.message_type === 'system' || msg.message_type === 'booking_card') {
        return (
          <MessageBubble
            message={msg}
            isOwn={isOwn}
            showSeenReceipt={false}
            isGroupStart
            isGroupEnd
            showAvatar={false}
          />
        );
      }

      const { isGroupStart, isGroupEnd } = getMessageGroupFlags(listItems, index, msg.sender_id);
      return (
        <MessageBubble
          message={msg}
          isOwn={isOwn}
          showSeenReceipt={isOwn && msg.id === lastOwnMessageId && lastOwnIsRead}
          isGroupStart={isGroupStart}
          isGroupEnd={isGroupEnd}
          showAvatar={!isOwn && isGroupEnd}
          avatarUri={headerAvatarUri}
          avatarName={headerInitialsSource}
        />
      );
    },
    [myId, lastOwnMessageId, lastOwnIsRead, listItems, headerAvatarUri, headerInitialsSource],
  );

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  const listContentStyle = useMemo(
    () => ({ paddingTop: theme.spacing.sm, paddingBottom: headerHeight + theme.spacing.xs }),
    [headerHeight],
  );

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
        {messagesLoading ? (
          <ThreadMessagesSkeleton />
        ) : thread.messages.length === 0 ? (
          <EmptyMessagesPlaceholder />
        ) : (
          <FlatList
            data={listItems}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            inverted
            contentContainerStyle={listContentStyle}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.4}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

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
              styles.disabledOuter,
              { paddingBottom: Math.max(insets.bottom, theme.spacing.md) },
            ]}
          >
            <ChatDisabledBanner />
          </View>
        )}
      </KeyboardAvoidingView>

      <ChatThreadHeader
        displayName={headerDisplayName}
        avatarUri={headerAvatarUri}
        initialsSource={headerInitialsSource}
        loading={campaignLoading}
        topInset={insets.top}
        onBack={() => {
          router.back();
        }}
        onInfo={handleThreadInfo}
        onHeightChange={setHeaderHeight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.backgroundClear,
  },
  body: {
    flex: 1,
  },
  disabledOuter: {
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
});
