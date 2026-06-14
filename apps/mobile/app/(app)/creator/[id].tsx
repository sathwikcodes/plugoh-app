import { Ionicons } from '@expo/vector-icons';
import type { Influencer } from '@plugoh/contracts';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCircleButton } from '@/components/ui/glass-circle-button';
import { AsyncText, ShimmerCircle, ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import { getInfluencer } from '@/lib/api/endpoints';
import { shouldShowInitialLoader } from '@/lib/query/loading';

type CreatorProfile = Influencer & {
  media?: Array<{ id?: string; media_url?: string; caption?: string; engagement?: number }>;
};

function initial(value?: string) {
  return value?.trim().charAt(0).toUpperCase() || 'P';
}

function profileImageUrl(profile?: CreatorProfile) {
  return profile?.profile_photo_url || profile?.avatar_url || undefined;
}

function creatorName(profile?: CreatorProfile) {
  return profile?.display_name?.trim() || profile?.ig_username?.trim() || 'Creator';
}

function instagramHandle(profile?: CreatorProfile) {
  const handle = profile?.ig_username?.trim() || profile?.instagram_handle?.trim();
  return handle ? `@${handle.replace(/^@/, '')}` : 'Not linked';
}

function formatNumber(value?: number) {
  if (value == null) return 'Not available';
  return Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

function formatCurrency(amount?: number | null) {
  if (amount == null) return 'Not set';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function InfoGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.infoGroup}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.infoRows}>{children}</View>
    </View>
  );
}

function DetailLine({
  icon,
  label,
  value,
  loading,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  loading?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.detailLine, isLast ? styles.detailLineLast : null]}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={18} color="rgba(255,255,255,0.78)" />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <AsyncText
          loading={Boolean(loading)}
          value={value || 'Not available'}
          selectable
          style={styles.detailValue}
          numberOfLines={2}
          shimmerWidth="64%"
          shimmerHeight={18}
        />
      </View>
    </View>
  );
}

function PriceLine({
  label,
  amount,
  icon,
  loading,
  isLast,
}: {
  label: string;
  amount?: number | null;
  icon: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  isLast?: boolean;
}) {
  return (
    <DetailLine
      icon={icon}
      label={label}
      value={formatCurrency(amount)}
      loading={loading}
      isLast={isLast}
    />
  );
}

export default function CreatorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const influencer = useQuery({
    queryKey: ['creator', id],
    queryFn: () => getInfluencer(id),
    enabled: Boolean(id),
  });

  const data = influencer.data;
  const loading = shouldShowInitialLoader(influencer);
  const name = creatorName(data);
  const imageUrl = profileImageUrl(data);
  const handle = instagramHandle(data);
  const city = data?.city?.trim();
  const category = data?.category?.trim();
  const positioning = [category, city].filter(Boolean).join(' · ');
  const startingPrice = data?.starterPrice ?? data?.price_per_reel ?? data?.price_per_post ?? null;
  const media = data?.media ?? [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + theme.spacing.section }}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={['#19151D', '#0B0C11', '#050509']}
        locations={[0, 0.52, 1]}
        style={[styles.hero, { paddingTop: insets.top + theme.spacing.md }]}
      >
        <View style={styles.headerRow}>
          <GlassCircleButton
            symbol="chevron.left"
            fallbackIcon="chevron-back"
            tintColor="#FFFFFF"
            size={44}
            symbolSize={20}
            accessibilityLabel="Go back"
            onPress={() => {
              router.back();
            }}
          />
        </View>

        <View style={styles.heroContent}>
          <View style={styles.avatar}>
            {loading ? (
              <ShimmerCircle size={76} />
            ) : imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <Text style={styles.avatarInitial}>{initial(name)}</Text>
            )}
          </View>
          <View style={styles.heroCopy}>
            <AsyncText
              loading={loading}
              value={name}
              selectable
              style={styles.creatorName}
              numberOfLines={2}
              shimmerWidth="74%"
              shimmerHeight={34}
            />
            {loading ? (
              <ShimmerText width="58%" height={18} />
            ) : (
              <Text selectable style={styles.handle} numberOfLines={1}>
                {handle}
              </Text>
            )}
            {!loading && positioning ? (
              <Text style={styles.positioning} numberOfLines={1}>
                {positioning}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.signalRow}>
          <View style={styles.signalPill}>
            {loading ? (
              <ShimmerText width={54} height={24} />
            ) : (
              <Text style={styles.signalValue} numberOfLines={1}>
                {formatNumber(data?.follower_count)}
              </Text>
            )}
            <Text style={styles.signalLabel}>Followers</Text>
          </View>
          <View style={styles.signalPill}>
            {loading ? (
              <ShimmerText width={54} height={24} />
            ) : (
              <Text style={styles.signalValue} numberOfLines={1}>
                {formatNumber(data?.avg_likes_per_reel)}
              </Text>
            )}
            <Text style={styles.signalLabel}>Avg likes</Text>
          </View>
          <View style={styles.signalPill}>
            {loading ? (
              <ShimmerText width={64} height={24} />
            ) : (
              <Text style={styles.signalValue} numberOfLines={1}>
                {formatCurrency(startingPrice)}
              </Text>
            )}
            <Text style={styles.signalLabel}>From</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Book ${name}`}
          disabled={loading || !id}
          onPress={() => {
            router.push(`/(app)/booking/${id}`);
          }}
          style={({ pressed }) => [styles.bookButton, pressed ? styles.pressed : null]}
        >
          <Text style={styles.bookButtonText}>Book creator</Text>
          <Ionicons name="arrow-forward" size={18} color="#0D0D0D" />
        </Pressable>

        <InfoGroup title="Creator details">
          <DetailLine icon="logo-instagram" label="Instagram" value={handle} loading={loading} />
          <DetailLine icon="sparkles" label="Category" value={category} loading={loading} />
          <DetailLine icon="location" label="Location" value={city} loading={loading} isLast />
        </InfoGroup>

        <InfoGroup title="Pricing">
          <PriceLine icon="videocam" label="Reel" amount={data?.price_per_reel} loading={loading} />
          <PriceLine icon="image" label="Post" amount={data?.price_per_post} loading={loading} />
          <PriceLine
            icon="phone-portrait"
            label="Story"
            amount={data?.price_per_story}
            loading={loading}
            isLast
          />
        </InfoGroup>

        {loading ? (
          <InfoGroup title="About">
            <View style={styles.textBlock}>
              <ShimmerText width="90%" height={16} />
              <ShimmerText width="78%" height={16} />
              <ShimmerText width="48%" height={16} />
            </View>
          </InfoGroup>
        ) : data?.bio ? (
          <InfoGroup title="About">
            <Text selectable style={styles.aboutText}>
              {data.bio}
            </Text>
          </InfoGroup>
        ) : null}

        {media.length > 0 ? (
          <InfoGroup title="Recent content">
            <View style={styles.mediaGrid}>
              {media.slice(0, 4).map((item, index) => (
                <View key={item.id ?? `${item.media_url}-${index}`} style={styles.mediaTile}>
                  {item.media_url ? (
                    <Image
                      source={{ uri: item.media_url }}
                      style={styles.mediaImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.mediaFallback}>
                      <Ionicons name="image" size={22} color="rgba(255,255,255,0.58)" />
                    </View>
                  )}
                  {item.engagement != null ? (
                    <View style={styles.mediaBadge}>
                      <Ionicons name="heart" size={12} color="#FFFFFF" />
                      <Text style={styles.mediaBadgeText}>{formatNumber(item.engagement)}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </InfoGroup>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.backgroundClear,
  },
  hero: {
    overflow: 'hidden',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  headerRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  pressed: {
    opacity: 0.72,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    ...theme.typography.title,
    color: '#111522',
    fontWeight: '900',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing.xs,
  },
  creatorName: {
    ...theme.typography.metric,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  handle: {
    ...theme.typography.body,
    color: 'rgba(255,190,210,0.9)',
  },
  positioning: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.52)',
  },
  signalRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  signalPill: {
    flex: 1,
    minHeight: 64,
    justifyContent: 'center',
    gap: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: theme.spacing.md,
  },
  signalValue: {
    ...theme.typography.metricSmall,
    color: '#FFFFFF',
  },
  signalLabel: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.48)',
  },
  body: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  bookButton: {
    minHeight: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: theme.spacing.xl,
  },
  bookButtonText: {
    ...theme.typography.bodyStrong,
    color: '#0D0D0D',
    fontWeight: '800',
  },
  infoGroup: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  groupTitle: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.42)',
    textTransform: 'uppercase',
    paddingHorizontal: theme.spacing.xs,
  },
  infoRows: {
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  detailLine: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.09)',
  },
  detailLineLast: {
    borderBottomWidth: 0,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  detailCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  detailLabel: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.48)',
  },
  detailValue: {
    ...theme.typography.cardTitle,
    color: '#FFFFFF',
  },
  textBlock: {
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  aboutText: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.76)',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  mediaTile: {
    flexBasis: '48%',
    flexGrow: 1,
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.48)',
    paddingHorizontal: theme.spacing.sm,
  },
  mediaBadgeText: {
    ...theme.typography.label,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
});
