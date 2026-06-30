import { CampaignAvatar } from '@/components/earnings/campaign-avatar';
import { BackHeader } from '@/components/ui/app-header';
import { GlassCard } from '@/components/ui/glass-card';
import { AsyncText, ShimmerCircle, ShimmerText } from '@/components/ui/shimmer';
import { TabScreenCanvas } from '@/components/ui/tab-screen-canvas';
import { theme } from '@/constants/theme';
import { formatDate, truncate, TX_AVATAR_SIZE } from '@/lib/influencer/earnings';
import { useCampaign, useCampaigns } from '@/hooks/use-marketplace';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import instagramImage from '@/assets/images/instagram.png';
import rocketImage from '@/assets/images/rocket.png';
import starImage from '@/assets/images/star.png';
import { Ionicons } from '@expo/vector-icons';
import { AppleMaps, GoogleMaps, type Coordinates } from 'expo-maps';
import { Image, type ImageProps } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BusinessProfileSummary, CampaignListItem } from '@plugoh/contracts';

function formatStatus(status?: string) {
  if (!status) return 'Status unavailable';
  return status.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCampaignAmount(campaign: CampaignListItem): string | null {
  const amount =
    campaign.price_offered_paise != null
      ? campaign.price_offered_paise / 100
      : campaign.price_offered;
  if (amount == null) return null;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function initial(value?: string) {
  return value?.trim().charAt(0).toUpperCase() || 'P';
}

function brandImageUrl(profile?: BusinessProfileSummary | null) {
  return (
    profile?.profile_photo_url ||
    profile?.ig_profile_picture_url ||
    profile?.avatar_url ||
    undefined
  );
}

function campaignTitle(campaign: CampaignListItem) {
  return campaign.ai_title?.trim() || campaign.title.trim() || 'Campaign';
}

function sameBrand(campaign: CampaignListItem, profile?: BusinessProfileSummary | null) {
  const other = campaign.business_profile;
  if (!other || !profile) return false;
  if (profile.user_id && other.user_id) return profile.user_id === other.user_id;
  if (profile.id && other.id) return profile.id === other.id;
  return false;
}

function brandCoordinates(profile?: BusinessProfileSummary | null): Coordinates | null {
  const lat = Number(profile?.brand_latitude);
  const lng = Number(profile?.brand_longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
}

// ─── Brand fact line (matches CampaignFactLine in campaign ID) ────────────────

function BrandFactLine({
  image,
  icon,
  value,
  loading,
}: {
  image?: ImageProps['source'];
  icon?: keyof typeof Ionicons.glyphMap;
  value: string;
  loading?: boolean;
}) {
  return (
    <View style={styles.factLine}>
      <View style={styles.factIcon}>
        {image ? (
          <Image
            source={image}
            style={styles.factImage}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
        ) : icon ? (
          <Ionicons name={icon} size={18} color="rgba(255,255,255,0.78)" />
        ) : null}
      </View>
      <AsyncText
        loading={Boolean(loading)}
        value={value}
        selectable
        style={styles.factText}
        numberOfLines={2}
        shimmerWidth="62%"
        shimmerHeight={18}
      />
    </View>
  );
}

// ─── Location map card (matches LocationMapCard in campaign ID) ───────────────

function BrandLocationCard({
  profile,
  loading,
}: {
  profile?: BusinessProfileSummary | null;
  loading?: boolean;
}) {
  const location = profile?.brand_location?.trim() || 'Location not specified';
  const parts = location
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const primary = parts[0] || location;
  const secondary = parts.slice(1).join(', ');
  const coordinates = brandCoordinates(profile);
  const cameraPosition = coordinates ? { coordinates, zoom: 15 } : undefined;
  const markers = coordinates ? [{ id: 'brand-location', coordinates, title: location }] : [];

  return (
    <View style={styles.locationSection}>
      <Text style={styles.sectionTitle}>Location</Text>
      <View style={styles.sectionDivider} />
      <View style={styles.locationMeta}>
        {loading ? (
          <View style={{ gap: 6 }}>
            <ShimmerText width={190} height={24} />
            <ShimmerText width={140} height={18} />
          </View>
        ) : (
          <View style={{ gap: 4 }}>
            <Text selectable style={styles.locationPrimary} numberOfLines={1}>
              {primary}
            </Text>
            {secondary ? (
              <Text selectable style={styles.locationSecondary} numberOfLines={1}>
                {secondary}
              </Text>
            ) : null}
          </View>
        )}
      </View>
      <View style={styles.locationCard}>
        {loading ? (
          <View style={styles.mapPlaceholder}>
            <ShimmerText width="56%" height={16} />
          </View>
        ) : coordinates && Platform.OS === 'ios' ? (
          <AppleMaps.View
            style={styles.nativeMap}
            cameraPosition={cameraPosition}
            markers={markers}
            uiSettings={{
              compassEnabled: false,
              myLocationButtonEnabled: false,
              scaleBarEnabled: false,
            }}
          />
        ) : coordinates && Platform.OS === 'android' ? (
          <GoogleMaps.View
            style={styles.nativeMap}
            cameraPosition={cameraPosition}
            markers={markers}
            uiSettings={{
              compassEnabled: false,
              myLocationButtonEnabled: false,
              zoomControlsEnabled: false,
            }}
          />
        ) : (
          <View style={styles.mapFallback}>
            <Ionicons name="location" size={18} color="rgba(255,255,255,0.72)" />
            <Text selectable style={styles.mapFallbackText} numberOfLines={2}>
              {location}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Campaign history row ─────────────────────────────────────────────────────

function CampaignRow({
  campaign,
  showDivider,
}: {
  campaign: CampaignListItem;
  showDivider: boolean;
}) {
  const title = campaignTitle(campaign);
  const imageUrl = brandImageUrl(campaign.business_profile) ?? undefined;
  const amount = formatCampaignAmount(campaign);
  const dateStr = campaign.created_at ? formatDate(campaign.created_at) : null;
  const meta = [formatStatus(campaign.status), dateStr].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
      onPress={() => {
        router.push(`/(app)/campaigns/${campaign.id}`);
      }}
      style={({ pressed }) => [styles.txRow, pressed && styles.pressed]}
    >
      <CampaignAvatar imageUrl={imageUrl} title={title} />
      <View style={styles.txBody}>
        <Text style={styles.txTitle} numberOfLines={1}>
          {truncate(title, 28)}
        </Text>
        <Text style={styles.txMeta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {amount ? <Text style={styles.txAmount}>{amount}</Text> : null}
      {showDivider ? <View style={styles.txDivider} /> : null}
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CampaignBrandProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const campaign = useCampaign(id);
  const campaigns = useCampaigns({ sort: 'created_desc' });
  const campaignLoading = shouldShowInitialLoader(campaign);
  const campaignsLoading = shouldShowInitialLoader(campaigns);

  const item = campaign.data;
  const profile = item?.business_profile;
  const brandName = profile?.brand_name?.trim() || 'Plugoh brand';
  const imageUrl = brandImageUrl(profile);

  const relatedCampaigns = useMemo(
    () => (campaigns.data?.items ?? []).filter((c) => c.id !== id && sameBrand(c, profile)),
    [campaigns.data?.items, id, profile],
  );

  const igHandle = profile?.ig_username ? `@${profile.ig_username.replace(/^@/, '')}` : null;

  const brandTypeFormatted = profile?.brand_type
    ? profile.brand_type.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  return (
    <TabScreenCanvas>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.md,
          paddingBottom: insets.bottom + theme.spacing.section,
        }}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.body}>
          {/* ── Back header ── */}
          <BackHeader
            title=""
            onBack={() => {
              router.back();
            }}
            style={styles.pageHeaderRow}
          />

          {/* ── Brand identity ── */}
          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              {campaignLoading ? (
                <ShimmerCircle size={60} />
              ) : imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <Text style={styles.avatarInitial}>{initial(brandName)}</Text>
              )}
            </View>
            <View style={styles.identityCopy}>
              <AsyncText
                loading={campaignLoading}
                value={brandName}
                selectable
                style={styles.brandName}
                numberOfLines={1}
                shimmerWidth="68%"
                shimmerHeight={24}
              />
              {campaignLoading ? (
                <ShimmerText width="54%" height={15} />
              ) : profile?.tagline ? (
                <Text selectable style={styles.tagline} numberOfLines={2}>
                  {profile.tagline}
                </Text>
              ) : null}
            </View>
          </View>

          {/* ── About (first) ── */}
          {campaignLoading ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>About</Text>
              <View style={styles.sectionDivider} />
              <View style={styles.briefSkeleton}>
                <ShimmerText width="92%" height={15} />
                <ShimmerText width="76%" height={15} />
                <ShimmerText width="54%" height={15} />
              </View>
            </View>
          ) : profile?.brand_summary ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>About</Text>
              <View style={styles.sectionDivider} />
              <Text selectable style={styles.descriptionText}>
                {profile.brand_summary}
              </Text>
            </View>
          ) : null}

          {/* ── Brand details (fact lines) ── */}
          {brandTypeFormatted || igHandle ? (
            <View style={styles.factsSection}>
              {brandTypeFormatted ? (
                <BrandFactLine
                  image={starImage}
                  value={brandTypeFormatted}
                  loading={campaignLoading}
                />
              ) : null}
              {igHandle ? (
                <BrandFactLine image={instagramImage} value={igHandle} loading={campaignLoading} />
              ) : null}
            </View>
          ) : null}

          {/* ── Location map ── */}
          <BrandLocationCard profile={profile} loading={campaignLoading} />

          {/* ── Campaign history ── */}
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionTitle}>Campaign history</Text>
              <Image
                source={rocketImage}
                style={styles.rocketImage}
                contentFit="contain"
                accessible={false}
              />
            </View>
            {campaignsLoading ? (
              <View style={styles.historySkeleton}>
                <ShimmerText width="80%" height={20} />
                <ShimmerText width="58%" height={15} />
              </View>
            ) : relatedCampaigns.length > 0 ? (
              <GlassCard style={styles.txShell} contentStyle={styles.txInner}>
                {relatedCampaigns.map((c, i) => (
                  <CampaignRow
                    key={c.id}
                    campaign={c}
                    showDivider={i < relatedCampaigns.length - 1}
                  />
                ))}
              </GlassCard>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="albums-outline" size={24} color="rgba(255,255,255,0.5)" />
                <Text style={styles.emptyTitle}>No other visible campaigns</Text>
                <Text style={styles.emptyBody}>
                  You can only see campaigns already available to your account.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </TabScreenCanvas>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.backgroundClear,
  },
  body: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  pageHeaderRow: {
    marginBottom: theme.spacing.xs,
  },
  pressed: {
    opacity: 0.72,
  },

  // ── Brand identity ──
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    flexShrink: 0,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    ...theme.typography.section,
    color: '#111522',
    fontWeight: '900',
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  brandName: {
    ...theme.typography.cardTitle,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tagline: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.58)',
  },
  // ── Fact lines (matches CampaignFactLine) ──
  factsSection: {
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  factLine: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  factIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factImage: {
    width: 24,
    height: 24,
  },
  factText: {
    ...theme.typography.bodyStrong,
    flex: 1,
    minWidth: 0,
    color: 'rgba(255,255,255,0.84)',
    fontWeight: '600',
  },

  // ── About / description (matches campaign ID descriptionSection) ──
  descriptionSection: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.headline,
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  descriptionText: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.66)',
    lineHeight: 25,
  },
  briefSkeleton: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },

  // ── Location map (matches campaign ID LocationMapCard) ──
  locationSection: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  locationMeta: {
    minHeight: 44,
    justifyContent: 'center',
  },
  locationPrimary: {
    ...theme.typography.section,
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '700',
  },
  locationSecondary: {
    ...theme.typography.bodyStrong,
    color: 'rgba(255,255,255,0.68)',
    fontWeight: '500',
  },
  locationCard: {
    height: 148,
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.075)',
  },
  nativeMap: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  mapFallbackText: {
    ...theme.typography.callout,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },

  // ── Campaign history (transaction row style) ──
  historySection: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rocketImage: {
    width: 48,
    height: 48,
    marginLeft: theme.spacing.lg,
    marginRight: theme.spacing.xs,
  },
  historySkeleton: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
  txShell: {
    width: '100%',
    borderRadius: 38,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  txInner: {
    paddingVertical: theme.spacing.sm,
  },
  txRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 76,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  txBody: {
    flex: 1,
    gap: theme.spacing.xs,
    minWidth: 0,
  },
  txTitle: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
  },
  txMeta: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.50)',
  },
  txAmount: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  txDivider: {
    position: 'absolute',
    left: theme.spacing.xl + TX_AVATAR_SIZE + theme.spacing.md,
    right: theme.spacing.xl,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  emptyState: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xl,
  },
  emptyTitle: {
    ...theme.typography.cardTitle,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emptyBody: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.48)',
    textAlign: 'center',
  },
});
