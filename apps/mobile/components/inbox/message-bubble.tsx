import { BrandAvatar } from '@/components/inbox/brand-avatar';
import { GlassCard } from '@/components/ui/glass-card';
import { theme } from '@/constants/theme';
import type { CampaignMessage } from '@plugoh/contracts';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { memo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

const BUBBLE_RADIUS = 20;
const BUBBLE_TIGHT = 6;
const AVATAR_SIZE = 28;

type Props = {
  message: CampaignMessage;
  isOwn: boolean;
  showSeenReceipt: boolean;
  /** First bubble of a same-sender run (top corner stays round). */
  isGroupStart: boolean;
  /** Last bubble of a same-sender run (bottom corner stays round, avatar shows). */
  isGroupEnd: boolean;
  /** Render the counterparty avatar beside an incoming message (group end only). */
  showAvatar: boolean;
  avatarUri?: string | null;
  avatarName?: string | null;
};

function fmtFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function systemLabel(msg: CampaignMessage): string {
  if (msg.message_type === 'booking_card') return 'Booking created';
  if (msg.content === 'call_requested') return 'Call requested';
  return msg.content;
}

function AttachmentContent({ message }: { message: CampaignMessage }) {
  const meta = message.metadata as
    | { fileName?: string; fileSize?: number; mimeType?: string }
    | undefined;
  return (
    <View style={styles.attachmentRow}>
      <View style={styles.attachmentIcon}>
        <SymbolView
          name="doc.fill"
          size={18}
          tintColor="rgba(255,255,255,0.85)"
          type="monochrome"
          fallback={<Ionicons name="document-outline" size={18} color="rgba(255,255,255,0.85)" />}
        />
      </View>
      <View style={styles.attachmentMeta}>
        <Text style={styles.attachmentName} numberOfLines={1} ellipsizeMode="middle">
          {meta?.fileName ?? 'Attachment'}
        </Text>
        {meta?.fileSize ? (
          <Text style={styles.attachmentSize}>{fmtFileSize(meta.fileSize)}</Text>
        ) : null}
      </View>
    </View>
  );
}

function SystemPill({ message }: { message: CampaignMessage }) {
  return (
    <Animated.View entering={FadeInUp.duration(220).springify()} style={styles.systemWrap}>
      <GlassCard style={styles.systemPill} contentStyle={styles.systemPillContent}>
        <Text style={styles.systemText}>{systemLabel(message)}</Text>
      </GlassCard>
    </Animated.View>
  );
}

function MessageBubbleComponent({
  message,
  isOwn,
  showSeenReceipt,
  isGroupStart,
  isGroupEnd,
  showAvatar,
  avatarUri,
  avatarName,
}: Props) {
  if (message.message_type === 'system' || message.message_type === 'booking_card') {
    return <SystemPill message={message} />;
  }

  const isAttachment = message.message_type === 'attachment';
  const groupMargin: ViewStyle = { marginBottom: isGroupEnd ? 10 : 2 };

  if (isOwn) {
    const ownRadius: ViewStyle = {
      borderTopLeftRadius: BUBBLE_RADIUS,
      borderBottomLeftRadius: BUBBLE_RADIUS,
      borderTopRightRadius: isGroupStart ? BUBBLE_RADIUS : BUBBLE_TIGHT,
      borderBottomRightRadius: isGroupEnd ? BUBBLE_RADIUS : BUBBLE_TIGHT,
    };
    return (
      <Animated.View
        entering={FadeInUp.duration(220).springify()}
        style={[styles.ownWrap, groupMargin]}
      >
        <LinearGradient
          colors={['#FF3CAC', theme.colors.rose]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ownBubble, ownRadius]}
        >
          {isAttachment ? (
            <AttachmentContent message={message} />
          ) : (
            <Text selectable style={styles.ownText}>
              {message.content}
            </Text>
          )}
        </LinearGradient>
        {showSeenReceipt ? <Text style={styles.seenText}>Seen</Text> : null}
      </Animated.View>
    );
  }

  const otherRadius: ViewStyle = {
    borderTopRightRadius: BUBBLE_RADIUS,
    borderBottomRightRadius: BUBBLE_RADIUS,
    borderTopLeftRadius: isGroupStart ? BUBBLE_RADIUS : BUBBLE_TIGHT,
    borderBottomLeftRadius: isGroupEnd ? BUBBLE_RADIUS : BUBBLE_TIGHT,
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(220).springify()}
      style={[styles.otherWrap, groupMargin]}
    >
      <View style={styles.avatarColumn}>
        {showAvatar ? (
          <BrandAvatar imageUri={avatarUri} name={avatarName} size={AVATAR_SIZE} textSize={12} />
        ) : null}
      </View>
      <GlassCard
        style={{ ...styles.otherBubbleShell, ...otherRadius }}
        contentStyle={styles.otherBubbleContent}
      >
        {isAttachment ? (
          <AttachmentContent message={message} />
        ) : (
          <Text selectable style={styles.otherText}>
            {message.content}
          </Text>
        )}
      </GlassCard>
    </Animated.View>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);

const styles = StyleSheet.create({
  ownWrap: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  ownBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '78%',
  },
  ownText: {
    ...theme.typography.body,
    color: '#FFFFFF',
  },
  seenText: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 3,
    marginRight: 4,
  },
  otherWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    gap: 8,
  },
  avatarColumn: {
    width: AVATAR_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  otherBubbleShell: {
    maxWidth: '78%',
  },
  otherBubbleContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  otherText: {
    ...theme.typography.body,
    color: theme.colors.foreground,
  },
  systemWrap: {
    alignSelf: 'center',
    marginVertical: 14,
  },
  systemPill: {
    borderRadius: 999,
    borderCurve: 'continuous',
  },
  systemPillContent: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemText: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.50)',
    textAlign: 'center',
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attachmentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentMeta: {
    flex: 1,
    gap: 2,
  },
  attachmentName: {
    ...theme.typography.label,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  attachmentSize: {
    ...theme.typography.labelSmall,
    color: 'rgba(255,255,255,0.60)',
  },
});
