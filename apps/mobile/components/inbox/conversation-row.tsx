import { BrandAvatar } from '@/components/inbox/brand-avatar';
import { theme } from '@/constants/theme';
import type { InboxItem } from '@plugoh/contracts';
import { memo } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  item: InboxItem;
  index: number;
  onPress: (item: InboxItem) => void;
  onLongPress: (item: InboxItem) => void;
  /** Name shown as the conversation title (e.g. brand name, or creator name for brand view). */
  nameLabel?: string | null;
  avatarImageUri?: string | null;
  avatarName?: string | null;
};

const RELATIVE_HOUR_MS = 3_600_000;
const RELATIVE_DAY_MS = 86_400_000;

// Instagram-style coarse relative time: only "now", hours, and days — no minutes.
function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < RELATIVE_HOUR_MS) return 'now';
  if (diff < RELATIVE_DAY_MS) return `${Math.floor(diff / RELATIVE_HOUR_MS)}h`;
  return `${Math.floor(diff / RELATIVE_DAY_MS)}d`;
}

function previewText(item: InboxItem): string {
  const msg = item.latestMessage;
  if (!msg) return 'No messages yet';
  if (msg.message_type === 'attachment') return msg.content || 'A file was shared';
  if (msg.message_type === 'booking_card') return msg.content || 'Booking details were created';
  if (msg.message_type === 'system') return msg.content;
  return msg.content;
}

function ConversationRowComponent({
  item,
  index,
  onPress,
  onLongPress,
  nameLabel,
  avatarImageUri,
  avatarName,
}: Props) {
  const participantName =
    nameLabel !== undefined ? nameLabel : item.campaign.business_profile?.brand_name;
  const resolvedAvatarName =
    avatarName ??
    item.campaign.business_profile?.brand_name ??
    participantName ??
    item.campaign.title;
  const resolvedAvatarImageUri =
    avatarImageUri ??
    item.campaign.business_profile?.profile_photo_url ??
    item.campaign.business_profile?.ig_profile_picture_url ??
    item.campaign.business_profile?.avatar_url ??
    null;
  const title = participantName || item.campaign.title;
  const sentAt = item.latestMessage?.created_at;

  return (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <Pressable
        onPress={() => {
          onPress(item);
        }}
        onLongPress={() => {
          onLongPress(item);
        }}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${item.campaign.title} conversation`}
      >
        <View style={styles.avatarWrap}>
          <BrandAvatar
            imageUri={resolvedAvatarImageUri}
            name={resolvedAvatarName}
            size={56}
            textSize={18}
          />
        </View>

        <View style={styles.body}>
          <Text style={styles.primaryTitle} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>

          <View style={styles.bottomRow}>
            <Text style={styles.preview} numberOfLines={1} ellipsizeMode="tail">
              {previewText(item)}
            </Text>
            {sentAt ? (
              <View style={styles.metaWrap}>
                <View style={styles.metaDot} />
                <Text style={styles.time}>{formatRelativeTime(sentAt)}</Text>
              </View>
            ) : null}
            <View style={styles.spacer} />
            {item.unreadCount > 0 ? <View style={styles.unreadDot} /> : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export const ConversationRow = memo(ConversationRowComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 88,
    gap: 14,
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  avatarWrap: {
    width: 56,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  primaryTitle: {
    ...theme.typography.cardTitle,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preview: {
    ...theme.typography.callout,
    color: 'rgba(255,255,255,0.66)',
    flexShrink: 1,
    minWidth: 0,
    fontWeight: '400',
  },
  metaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.42)',
    marginHorizontal: 6,
  },
  time: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.42)',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  spacer: {
    flex: 1,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: '#FF3CAC',
    flexShrink: 0,
    marginLeft: 10,
  },
});
