import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Card, PrimaryButton, Screen, SectionTitle, StatusChip } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useCampaign, useMarketplaceMutations, useMessages } from '@/hooks/use-marketplace';

export default function InboxThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [draft, setDraft] = useState('');
  const campaign = useCampaign(id);
  const messages = useMessages(id);
  const mutations = useMarketplaceMutations();
  const chatEnabled = ['in_escrow', 'delivery_submitted', 'completed', 'disputed'].includes(
    campaign.data?.status ?? '',
  );

  const handleSend = async () => {
    if (!draft.trim()) return;
    try {
      await mutations.sendMessage.mutateAsync({ id, content: draft.trim() });
      setDraft('');
    } catch (error) {
      Alert.alert('Could not send message', error instanceof Error ? error.message : 'Try again.');
    }
  };

  const handleAttachment = async () => {
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
  };

  return (
    <Screen>
      <SectionTitle
        title={campaign.data?.title ?? 'Thread'}
        subtitle="Operational chat for delivery, revisions, and approvals."
      />
      <StatusChip
        label={(campaign.data?.status ?? 'loading').replaceAll('_', ' ')}
        status={campaign.data?.status}
      />
      <FlashList
        data={messages.data ?? []}
        renderItem={({ item }) => (
          <Card
            style={{
              backgroundColor:
                item.sender_id === campaign.data?.influencer_profile?.user_id
                  ? theme.colors.surfaceBlush
                  : theme.colors.surface,
            }}
          >
            <Text style={{ ...theme.typography.body, color: theme.colors.foreground }}>
              {item.content}
            </Text>
            {item.message_type === 'attachment' ? (
              <Text style={{ ...theme.typography.label, color: theme.colors.accentStrong }}>
                Attachment:{' '}
                {(item.metadata as Record<string, string> | undefined)?.fileName ?? 'file'}
              </Text>
            ) : null}
          </Card>
        )}
      />
      <View style={{ gap: 12 }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          editable={chatEnabled}
          placeholder={chatEnabled ? 'Write a clear update' : 'Chat is locked for this status'}
          placeholderTextColor={theme.colors.muted}
          style={{
            minHeight: 52,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.card,
            paddingHorizontal: theme.spacing.lg,
            color: theme.colors.foreground,
          }}
        />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <PrimaryButton
            label="Send"
            onPress={handleSend}
            disabled={!chatEnabled || mutations.sendMessage.isPending}
            style={{ flex: 1 }}
          />
          <Pressable
            onPress={handleAttachment}
            disabled={!chatEnabled}
            style={{
              minHeight: 52,
              minWidth: 52,
              borderRadius: theme.radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.surfaceWarm,
              borderWidth: 1,
              borderColor: theme.colors.borderStrong,
            }}
          >
            <Text style={{ ...theme.typography.cardTitle, color: theme.colors.foreground }}>+</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
