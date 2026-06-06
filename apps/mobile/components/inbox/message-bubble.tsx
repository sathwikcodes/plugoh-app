import { GlassCard } from '@/components/ui/glass-card';
import { theme } from '@/constants/theme';
import type { CampaignMessage } from '@plugoh/contracts';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  message: CampaignMessage;
  isOwn: boolean;
  showSeenReceipt: boolean;
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

export function MessageBubble({ message, isOwn, showSeenReceipt }: Props) {
  if (message.message_type === 'system' || message.message_type === 'booking_card') {
    return (
      <Animated.View entering={FadeInUp.duration(220).springify()} style={styles.systemWrap}>
        <View style={styles.systemPill}>
          <Text style={styles.systemText}>{systemLabel(message)}</Text>
        </View>
      </Animated.View>
    );
  }

  const isAttachment = message.message_type === 'attachment';

  if (isOwn) {
    return (
      <Animated.View entering={FadeInUp.duration(220).springify()} style={styles.ownWrap}>
        <LinearGradient
          colors={['#FF3CAC', theme.colors.rose]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ownBubble}
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

  return (
    <Animated.View entering={FadeInUp.duration(220).springify()} style={styles.otherWrap}>
      <GlassCard style={styles.otherBubbleShell} contentStyle={styles.otherBubbleContent}>
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

const styles = StyleSheet.create({
  ownWrap: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 3,
  },
  ownBubble: {
    borderRadius: 20,
    borderBottomRightRadius: 5,
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
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 3,
  },
  otherBubbleShell: {
    borderRadius: 20,
    borderBottomLeftRadius: 5,
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
    marginVertical: 6,
  },
  systemPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
