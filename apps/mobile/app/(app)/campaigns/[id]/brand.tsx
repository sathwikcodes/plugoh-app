import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCircleButton } from '@/components/ui/glass-circle-button';
import { AsyncText, ShimmerCircle, ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import { useCampaign, useCampaigns } from '@/hooks/use-marketplace';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import type { BusinessProfileSummary, CampaignListItem } from '@plugoh/contracts';

function formatStatus(status?: string) {
  if (!status) return 'Status unavailable';
  return status.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPackageType(pkg?: string) {
  if (!pkg) return 'Package not specified';
  return pkg
    .replaceAll('_', ' ')
    .replaceAll('+', ' + ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(amount?: number) {
  if (amount == null) return 'Payout not set';
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

function CampaignRow({ campaign }: { campaign: CampaignListItem }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${campaignTitle(campaign)}`}
      onPress={() => {
        router.push(`/(app)/campaigns/${campaign.id}`);
      }}
      style={({ pressed }) => [styles.campaignRow, pressed ? styles.pressed : null]}
    >
      <View style={styles.campaignRowIcon}>
        <Ionicons name="sparkles" size={18} color="rgba(255,255,255,0.82)" />
      </View>
      <View style={styles.campaignRowCopy}>
        <Text selectable style={styles.campaignRowTitle} numberOfLines={2}>
          {campaignTitle(campaign)}
        </Text>
        <Text style={styles.campaignRowMeta} numberOfLines={1}>
          {formatCurrency(campaign.price_offered)} - {formatPackageType(campaign.package_type)}
        </Text>
      </View>
      <View style={styles.statusPill}>
        <Text style={styles.statusPillText} numberOfLines={1}>
          {formatStatus(campaign.status)}
        </Text>
      </View>
    </Pressable>
  );
}

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
    () =>
      (campaigns.data?.items ?? []).filter(
        (candidate) => candidate.id !== id && sameBrand(candidate, profile),
      ),
    [campaigns.data?.items, id, profile],
  );
  const visibleBrandCampaignCount = (item && profile ? 1 : 0) + relatedCampaigns.length;
  const visiblePayoutTotal = [item, ...relatedCampaigns].reduce(
    (sum, candidate) => sum + (candidate?.price_offered ?? 0),
    0,
  );

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
            {campaignLoading ? (
              <ShimmerCircle size={76} />
            ) : imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <Text style={styles.avatarInitial}>{initial(brandName)}</Text>
            )}
          </View>
          <View style={styles.heroCopy}>
            <AsyncText
              loading={campaignLoading}
              value={brandName}
              selectable
              style={styles.brandName}
              numberOfLines={2}
              shimmerWidth="74%"
              shimmerHeight={34}
            />
            {campaignLoading ? (
              <ShimmerText width="58%" height={18} />
            ) : profile?.tagline ? (
              <Text selectable style={styles.tagline} numberOfLines={2}>
                {profile.tagline}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.signalRow}>
          <View style={styles.signalPill}>
            {campaignLoading || campaignsLoading ? (
              <ShimmerText width={32} height={24} />
            ) : (
              <Text style={styles.signalValue} numberOfLines={1}>
                {visibleBrandCampaignCount}
              </Text>
            )}
            <Text style={styles.signalLabel}>Visible campaigns</Text>
          </View>
          <View style={styles.signalPill}>
            {campaignLoading || campaignsLoading ? (
              <ShimmerText width={74} height={24} />
            ) : (
              <Text style={styles.signalValue} numberOfLines={1}>
                {formatCurrency(visiblePayoutTotal)}
              </Text>
            )}
            <Text style={styles.signalLabel}>Visible payout</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <InfoGroup title="Brand details">
          <DetailLine
            icon="pricetag"
            label="Type"
            value={profile?.brand_type}
            loading={campaignLoading}
          />
          <DetailLine
            icon="location"
            label="Location"
            value={profile?.brand_location}
            loading={campaignLoading}
          />
          <DetailLine
            icon="logo-instagram"
            label="Instagram"
            value={
              profile?.ig_username
                ? `@${profile.ig_username.replace(/^@/, '')}`
                : profile?.instagram_connected
                  ? 'Connected'
                  : undefined
            }
            loading={campaignLoading}
            isLast
          />
        </InfoGroup>

        {campaignLoading ? (
          <InfoGroup title="About">
            <View style={styles.textBlock}>
              <ShimmerText width="90%" height={16} />
              <ShimmerText width="78%" height={16} />
              <ShimmerText width="48%" height={16} />
            </View>
          </InfoGroup>
        ) : profile?.brand_summary ? (
          <InfoGroup title="About">
            <Text selectable style={styles.aboutText}>
              {profile.brand_summary}
            </Text>
          </InfoGroup>
        ) : null}

        <InfoGroup title="Campaign history">
          {campaignsLoading ? (
            <View style={styles.historySkeleton}>
              <ShimmerText width="82%" height={22} />
              <ShimmerText width="62%" height={16} />
            </View>
          ) : relatedCampaigns.length > 0 ? (
            relatedCampaigns.map((candidate) => (
              <CampaignRow key={candidate.id} campaign={candidate} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="albums-outline" size={24} color="rgba(255,255,255,0.5)" />
              <Text style={styles.emptyTitle}>No other visible campaigns</Text>
              <Text style={styles.emptyBody}>
                You can only see brand campaigns already available to your account.
              </Text>
            </View>
          )}
        </InfoGroup>
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
  brandName: {
    ...theme.typography.metric,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  tagline: {
    ...theme.typography.body,
    color: 'rgba(255,190,210,0.88)',
  },
  signalRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
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
  historySkeleton: {
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  campaignRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.09)',
  },
  campaignRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  campaignRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  campaignRowTitle: {
    ...theme.typography.cardTitle,
    color: '#FFFFFF',
  },
  campaignRowMeta: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.48)',
  },
  statusPill: {
    maxWidth: 104,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: theme.spacing.sm,
  },
  statusPillText: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.74)',
  },
  emptyState: {
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
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
