import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, SecondaryButton } from '@/components/ui/primitives';
import { AsyncText, ShimmerCircle, ShimmerText } from '@/components/ui/shimmer';
import { statusTone, theme } from '@/constants/theme';
import { useBootstrap, useCampaign, useMarketplaceMutations } from '@/hooks/use-marketplace';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import type { CampaignListItem } from '@plugoh/contracts';

function formatStatus(status?: string) {
  if (!status) return 'Status unavailable';
  return status.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPackageType(pkg?: string) {
  if (!pkg) return 'Not specified';
  return pkg
    .replaceAll('_', ' ')
    .replaceAll('+', ' + ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(amount?: number) {
  if (amount == null) return 'Not set';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function brandImageUrl(campaign?: CampaignListItem) {
  return (
    campaign?.business_profile?.profile_photo_url ||
    campaign?.business_profile?.ig_profile_picture_url ||
    campaign?.business_profile?.avatar_url ||
    undefined
  );
}

function initial(value?: string) {
  return value?.trim().charAt(0).toUpperCase() || 'P';
}

function parseBriefValue(brief: string | undefined, label: string) {
  if (!brief) return null;
  const prefix = `${label}:`;
  const match = brief
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.toLowerCase().startsWith(prefix.toLowerCase()));
  return match?.slice(prefix.length).trim() || null;
}

function displayBrief(brief?: string) {
  if (!brief) return 'No campaign brief added yet.';
  return brief
    .split('\n')
    .filter((line) => !/^(Objective|Package|Timing|Venue):/i.test(line.trim()))
    .join('\n')
    .trim();
}

function formatDateTime(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function campaignDateLine(item?: CampaignListItem) {
  if (!item) return 'Timing not specified';
  const timing = parseBriefValue(item.brief, 'Timing');
  if (timing) return timing.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    formatDateTime(item.completed_at) ||
    formatDateTime(item.delivery_submitted_at) ||
    formatDateTime(item.expires_at) ||
    'Timing not specified'
  );
}

function campaignLocation(item?: CampaignListItem) {
  return (
    parseBriefValue(item?.brief, 'Venue') ||
    item?.business_profile?.brand_location?.trim() ||
    'Location not specified'
  );
}

function DetailRow({
  icon,
  label,
  value,
  loading,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={18} color="#F4D98A" />
      </View>
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <AsyncText
          loading={Boolean(loading)}
          value={value}
          selectable
          style={styles.detailValue}
          numberOfLines={2}
          shimmerWidth="68%"
          shimmerHeight={18}
        />
      </View>
    </View>
  );
}

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const bootstrap = useBootstrap();
  const campaign = useCampaign(id);
  const mutations = useMarketplaceMutations();
  const role = bootstrap.data?.role ?? 'influencer';
  const bootstrapLoading = shouldShowInitialLoader(bootstrap);
  const campaignLoading = bootstrapLoading || shouldShowInitialLoader(campaign);

  const item = campaign.data;
  const imageUrl = brandImageUrl(item);
  const brandName = item?.business_profile?.brand_name?.trim() || 'Plugoh brand';
  const title = item ? item.title.trim() || 'Campaign' : 'Campaign';
  const objective = parseBriefValue(item?.brief, 'Objective');
  const brief = displayBrief(item?.brief);
  const tone = statusTone(item?.status);
  const heroHeight = Math.min(Math.max(window.height * 0.58, 480), 560);
  const titleFontSize = title.length > 34 ? 32 : title.length > 20 ? 36 : 40;

  const canRespond =
    role === 'influencer' &&
    item &&
    ['requested', 'payment_pending', 'pre_authorized'].includes(item.status);
  const canDeliver = item && item.status === 'in_escrow';
  const canApprove = role === 'business' && item?.status === 'delivery_submitted';

  const handleDecline = async () => {
    try {
      await mutations.declineCampaign.mutateAsync(id);
      router.back();
    } catch (error) {
      Alert.alert('Could not decline', error instanceof Error ? error.message : 'Try again.');
    }
  };

  const handleAccept = async () => {
    try {
      await mutations.acceptCampaign.mutateAsync(id);
      await campaign.refetch();
    } catch (error) {
      Alert.alert('Could not accept', error instanceof Error ? error.message : 'Try again.');
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + theme.spacing.section }}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { height: heroHeight }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <LinearGradient
            colors={['#EF3320', '#B20A86', '#3D00A8', '#070047']}
            locations={[0, 0.34, 0.68, 1]}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.78)']}
          locations={[0, 0.48, 1]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(231,106,146,0.18)', 'rgba(245,192,166,0)', 'rgba(5,5,9,0.68)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.heroControls, { paddingTop: insets.top + theme.spacing.md }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => {
              router.back();
            }}
            style={({ pressed }) => [styles.circleButton, pressed ? styles.pressed : null]}
          >
            <Ionicons name="close" size={25} color="#FFFFFF" />
          </Pressable>
          <View style={[styles.previewPill, { backgroundColor: tone.bg }]}>
            <AsyncText
              loading={campaignLoading}
              value={formatStatus(item?.status)}
              style={[styles.previewText, { color: tone.fg }]}
              shimmerWidth={92}
              shimmerHeight={18}
            />
          </View>
        </View>

        <View style={styles.heroBottom}>
          <View style={styles.brandIdentity}>
            <View style={styles.brandAvatar}>
              {campaignLoading ? (
                <ShimmerCircle size={72} />
              ) : imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.brandAvatarImage}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.brandAvatarInitial}>{initial(brandName)}</Text>
              )}
            </View>
            <AsyncText
              loading={campaignLoading}
              value={brandName}
              style={styles.brandName}
              numberOfLines={1}
              shimmerWidth={140}
              shimmerHeight={18}
            />
          </View>

          {campaignLoading ? (
            <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
              <ShimmerText width={Math.min(window.width - theme.spacing.jumbo, 360)} height={42} />
              <ShimmerText width={Math.min(window.width - theme.spacing.jumbo, 260)} height={42} />
            </View>
          ) : (
            <Text
              selectable
              style={[
                styles.heroTitle,
                {
                  maxWidth: Math.min(window.width - theme.spacing.jumbo, 560),
                  fontSize: titleFontSize,
                  lineHeight: titleFontSize + 5,
                },
              ]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
            >
              {title}
            </Text>
          )}

          <View style={styles.eventPanel}>
            <View style={styles.eventPanelRow}>
              <Ionicons name="calendar" size={24} color="#B889FF" />
              <AsyncText
                loading={campaignLoading}
                value={campaignDateLine(item)}
                style={styles.eventPanelText}
                shimmerWidth="70%"
                shimmerHeight={20}
              />
            </View>
            <View style={styles.eventDivider} />
            <View style={styles.eventPanelRow}>
              <Ionicons name="location" size={24} color="#B889FF" />
              <AsyncText
                loading={campaignLoading}
                value={campaignLocation(item)}
                style={styles.eventPanelText}
                shimmerWidth="76%"
                shimmerHeight={20}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.nativeGroup}>
          <DetailRow
            icon="cash"
            label="Payout"
            value={formatCurrency(item?.price_offered)}
            loading={campaignLoading}
          />
          <DetailRow
            icon="sparkles"
            label="Package"
            value={formatPackageType(item?.package_type)}
            loading={campaignLoading}
          />
          <DetailRow
            icon="flag"
            label="Objective"
            value={objective ? formatStatus(objective) : 'Not specified'}
            loading={campaignLoading}
          />
          <DetailRow
            icon="card"
            label="Payment"
            value={formatStatus(item?.payment_status)}
            loading={campaignLoading}
          />
        </View>

        {campaignLoading ? (
          <View style={styles.briefCard}>
            <ShimmerText width="48%" height={18} />
            <ShimmerText width="92%" height={15} />
            <ShimmerText width="78%" height={15} />
          </View>
        ) : brief ? (
          <View style={styles.briefCard}>
            <Text style={styles.groupTitle}>Campaign brief</Text>
            <Text selectable style={styles.briefText}>
              {brief}
            </Text>
          </View>
        ) : null}

        {canRespond ? (
          <View style={styles.actionGroup}>
            <PrimaryButton
              label={mutations.acceptCampaign.isPending ? 'Accepting...' : 'Accept campaign'}
              onPress={handleAccept}
            />
            <SecondaryButton label="Decline request" onPress={handleDecline} />
          </View>
        ) : null}

        {canDeliver ? (
          <PrimaryButton
            label="Submit delivery"
            onPress={() => {
              router.push(`/(app)/delivery/${id}`);
            }}
          />
        ) : null}

        {canApprove ? (
          <View style={styles.actionGroup}>
            <PrimaryButton
              label={
                mutations.approveCampaignDelivery.isPending ? 'Approving...' : 'Approve delivery'
              }
              onPress={async () => {
                try {
                  await mutations.approveCampaignDelivery.mutateAsync({
                    id,
                    idempotencyKey: `approve-${id}-${Date.now()}`,
                  });
                  await campaign.refetch();
                } catch (error) {
                  Alert.alert(
                    'Could not approve',
                    error instanceof Error ? error.message : 'Try again.',
                  );
                }
              }}
            />
            <SecondaryButton
              label="Dispute delivery"
              onPress={async () => {
                try {
                  await mutations.disputeCampaignDelivery.mutateAsync({
                    id,
                    reason: 'Needs revision',
                  });
                  await campaign.refetch();
                } catch (error) {
                  Alert.alert(
                    'Could not dispute',
                    error instanceof Error ? error.message : 'Try again.',
                  );
                }
              }}
            />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050509',
  },
  hero: {
    overflow: 'hidden',
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 38,
    backgroundColor: '#100017',
  },
  heroControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xxl,
  },
  circleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  pressed: {
    opacity: 0.72,
  },
  previewPill: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingHorizontal: theme.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  previewText: {
    ...theme.typography.cardTitle,
    fontWeight: '900',
  },
  heroBottom: {
    position: 'absolute',
    left: theme.spacing.xl,
    right: theme.spacing.xl,
    bottom: theme.spacing.xxl,
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  brandIdentity: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  brandAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EEF8',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.84)',
  },
  brandAvatarImage: {
    width: '100%',
    height: '100%',
  },
  brandAvatarInitial: {
    color: '#101522',
    fontSize: 28,
    fontWeight: '900',
  },
  brandName: {
    maxWidth: '82%',
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.28)',
    color: 'rgba(255,255,255,0.9)',
    fontFamily: theme.typography.cardTitle.fontFamily,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: theme.typography.display.fontFamily,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.8,
    textShadowColor: 'rgba(0,0,0,0.42)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  eventPanel: {
    alignSelf: 'stretch',
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(20,0,70,0.58)',
  },
  eventPanelRow: {
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: theme.spacing.xl,
  },
  eventPanelText: {
    ...theme.typography.section,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  eventDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  body: {
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  nativeGroup: {
    overflow: 'hidden',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  detailRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,217,138,0.12)',
  },
  detailTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  detailLabel: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.52)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailValue: {
    ...theme.typography.cardTitle,
    color: '#FFFFFF',
  },
  briefCard: {
    gap: theme.spacing.sm,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: theme.spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  groupTitle: {
    ...theme.typography.section,
    color: '#FFFFFF',
  },
  briefText: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.74)',
  },
  actionGroup: {
    gap: theme.spacing.md,
  },
});
