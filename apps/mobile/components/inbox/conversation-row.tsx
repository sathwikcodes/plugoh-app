import { BrandAvatar } from '@/components/inbox/brand-avatar';
import { theme } from '@/constants/theme';
import type { InboxItem } from '@plugoh/contracts';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  item: InboxItem;
  index: number;
  onPress: () => void;
  onLongPress: () => void;
  /** Override the secondary name shown below the campaign title (e.g. creator name for brand view). */
  nameLabel?: string | null;
  avatarImageUri?: string | null;
  avatarName?: string | null;
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isThisYear = d.getFullYear() === now.getFullYear();
  if (isToday) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (isThisYear) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function previewText(item: InboxItem): string {
  const msg = item.latestMessage;
  if (!msg) return 'Start the conversation from this campaign thread.';
  if (msg.message_type === 'attachment') return msg.content || 'A file was shared';
  if (msg.message_type === 'booking_card') return msg.content || 'Booking details were created';
  if (msg.message_type === 'system') return msg.content;
  return msg.content;
}

export function ConversationRow({
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
  const timestamp = item.latestMessage?.created_at;
  const title = participantName || item.campaign.title;
  const secondaryLine =
    participantName && participantName.trim() !== item.campaign.title.trim()
      ? item.campaign.title
      : null;

  return (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
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
          <View style={styles.topRow}>
            <Text style={styles.primaryTitle} numberOfLines={1} ellipsizeMode="tail">
              {title}
            </Text>
            {timestamp ? <Text style={styles.timestamp}>{formatTimestamp(timestamp)}</Text> : null}
          </View>

          {secondaryLine ? (
            <Text style={styles.secondaryLine} numberOfLines={1} ellipsizeMode="tail">
              {secondaryLine}
            </Text>
          ) : null}

          <View style={styles.bottomRow}>
            <Text style={styles.preview} numberOfLines={1} ellipsizeMode="tail">
              {previewText(item)}
            </Text>
            {item.unreadCount > 0 ? (
              <LinearGradient
                colors={['#FF3CAC', theme.colors.rose]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.badge}
              >
                <Text style={styles.badgeText}>
                  {item.unreadCount > 99 ? '99+' : String(item.unreadCount)}
                </Text>
              </LinearGradient>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    paddingTop: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryTitle: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
    flex: 1,
  },
  timestamp: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.42)',
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
  },
  secondaryLine: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.42)',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preview: {
    ...theme.typography.callout,
    color: 'rgba(255,255,255,0.66)',
    flex: 1,
    fontWeight: '500',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeText: {
    ...theme.typography.labelSmall,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
});
