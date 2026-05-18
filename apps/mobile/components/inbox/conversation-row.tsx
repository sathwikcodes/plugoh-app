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
  if (!msg) return 'No messages yet';
  if (msg.message_type === 'attachment') return '📎 Attachment';
  if (msg.message_type === 'booking_card') return 'Booking created';
  if (msg.message_type === 'system') return msg.content;
  return msg.content;
}

export function ConversationRow({ item, index, onPress, onLongPress, nameLabel }: Props) {
  const brandName =
    nameLabel !== undefined ? nameLabel : item.campaign.business_profile?.brand_name;
  const avatarName = item.campaign.business_profile?.brand_name ?? item.campaign.title;
  const avatarImageUri =
    item.campaign.business_profile?.profile_photo_url ??
    item.campaign.business_profile?.ig_profile_picture_url ??
    item.campaign.business_profile?.avatar_url ??
    null;
  const timestamp = item.latestMessage?.created_at;

  return (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${item.campaign.title} conversation`}
      >
        {/* Avatar */}
        <BrandAvatar imageUri={avatarImageUri} name={avatarName} />

        {/* Body */}
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.campaignTitle} numberOfLines={1} ellipsizeMode="tail">
              {item.campaign.title}
            </Text>
            {timestamp ? <Text style={styles.timestamp}>{formatTimestamp(timestamp)}</Text> : null}
          </View>

          {brandName ? (
            <Text style={styles.brandName} numberOfLines={1}>
              {brandName}
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 72,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  campaignTitle: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
    flex: 1,
  },
  timestamp: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.35)',
    flexShrink: 0,
  },
  brandName: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.45)',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preview: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.40)',
    flex: 1,
    fontSize: 14,
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
    ...theme.typography.label,
    color: '#FFFFFF',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
});
