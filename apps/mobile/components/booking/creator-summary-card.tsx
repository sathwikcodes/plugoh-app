import { GlassCard } from '@/components/ui/glass-card';
import { AsyncText, ShimmerCircle, ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import type { Influencer } from '@plugoh/contracts';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

type CreatorSummaryCardProps = {
  influencer?: Influencer | null;
  loading?: boolean;
};

function initial(value?: string) {
  return value?.trim().charAt(0).toUpperCase() || 'P';
}

function creatorName(influencer?: Influencer | null) {
  return influencer?.display_name?.trim() || influencer?.ig_username?.trim() || 'Creator';
}

function instagramHandle(influencer?: Influencer | null) {
  const handle = influencer?.ig_username?.trim() || influencer?.instagram_handle?.trim();
  return handle ? `@${handle.replace(/^@/, '')}` : 'Not linked';
}

function profileImageUrl(influencer?: Influencer | null) {
  return influencer?.profile_photo_url || influencer?.avatar_url || undefined;
}

export function CreatorSummaryCard({ influencer, loading }: CreatorSummaryCardProps) {
  const name = creatorName(influencer);
  const handle = instagramHandle(influencer);
  const imageUrl = profileImageUrl(influencer);
  const positioning = [influencer?.category, influencer?.city].filter(Boolean).join(' · ');

  return (
    <GlassCard style={styles.card} contentStyle={styles.content}>
      <View style={styles.avatar}>
        {loading ? (
          <ShimmerCircle size={56} />
        ) : imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.avatarImage} contentFit="cover" />
        ) : (
          <Text style={styles.avatarInitial}>{initial(name)}</Text>
        )}
      </View>
      <View style={styles.copy}>
        <AsyncText
          loading={Boolean(loading)}
          value={name}
          style={styles.name}
          numberOfLines={1}
          shimmerWidth="66%"
          shimmerHeight={20}
        />
        {loading ? (
          <ShimmerText width="46%" height={16} />
        ) : (
          <Text style={styles.handle} numberOfLines={1}>
            {handle}
          </Text>
        )}
        {!loading && positioning ? (
          <Text style={styles.positioning} numberOfLines={1}>
            {positioning}
          </Text>
        ) : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderCurve: 'continuous',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
    flexShrink: 0,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    ...theme.typography.cardTitle,
    color: '#111522',
    fontWeight: '900',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
  },
  handle: {
    ...theme.typography.body,
    color: 'rgba(255,190,210,0.9)',
  },
  positioning: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.52)',
  },
});
