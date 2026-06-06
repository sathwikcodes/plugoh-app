import { router, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AsyncText, ShimmerCircle, ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
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

function creatorImageUrl(campaign?: CampaignListItem) {
  return (
    campaign?.influencer_profile?.profile_photo_url ||
    campaign?.influencer_profile?.avatar_url ||
    undefined
  );
}

function cardImageUrl(campaign?: CampaignListItem) {
  return campaign?.card_image_url || brandImageUrl(campaign);
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
  if (!brief) return '';
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

function scheduleTitle(item?: CampaignListItem) {
  const value = item?.completed_at || item?.delivery_submitted_at || item?.expires_at;
  if (!value) return 'Schedule';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Schedule';

  const today = new Date();
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return 'Today';
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function locationParts(location: string) {
  const [primary, ...rest] = location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    primary: primary || location,
    secondary: rest.join(', '),
  };
}

function creatorDisplayName(campaign?: CampaignListItem) {
  return (
    campaign?.influencer_profile?.display_name?.trim() ||
    campaign?.influencer_profile?.ig_username?.trim() ||
    'Creator'
  );
}

function creatorMeta(campaign?: CampaignListItem) {
  const handle = campaign?.influencer_profile?.ig_username?.trim();
  return handle ? `@${handle.replace(/^@/, '')}` : '';
}

function ActionPill({
  label,
  onPress,
  tint,
  disabled,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  tint: 'accept' | 'decline';
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  const tintOverlayColor =
    tint === 'accept' ? 'rgba(35, 174, 97, 0.34)' : 'rgba(230, 70, 70, 0.34)';
  const borderColor = tint === 'accept' ? 'rgba(94, 255, 168, 0.34)' : 'rgba(255, 126, 126, 0.34)';
  const textColor = tint === 'accept' ? '#B8FFD3' : '#FFD0D0';
  const shellStyle = [
    styles.actionGlass,
    {
      borderColor,
      opacity: disabled ? 0.58 : 1,
    },
  ];
  const content = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.actionPressable,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.actionTint, { backgroundColor: tintOverlayColor }]}
      />
      <Text style={[styles.actionText, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView isInteractive glassEffectStyle="regular" colorScheme="dark" style={shellStyle}>
        {content}
      </GlassView>
    );
  }

  return (
    <BlurView tint="systemUltraThinMaterialDark" intensity={82} style={shellStyle}>
      {content}
    </BlurView>
  );
}

function InfoGroup({
  title,
  children,
  style,
}: {
  title: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.infoGroup, style]}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.infoRows}>{children}</View>
    </View>
  );
}

function InfoLine({
  icon,
  label,
  value,
  loading,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  loading?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.infoLine, isLast ? styles.infoLineLast : null]}>
      <View style={styles.infoLineIcon}>
        <Ionicons name={icon} size={18} color="rgba(255,255,255,0.78)" />
      </View>
      <View style={styles.infoLineCopy}>
        <Text style={styles.infoLineLabel}>{label}</Text>
        <AsyncText
          loading={Boolean(loading)}
          value={value}
          selectable
          style={styles.infoLineValue}
          numberOfLines={2}
          shimmerWidth="70%"
          shimmerHeight={18}
        />
      </View>
    </View>
  );
}

function ScheduleCard({ item, loading }: { item?: CampaignListItem; loading?: boolean }) {
  const location = campaignLocation(item);
  const { primary, secondary } = locationParts(location);

  return (
    <View style={styles.infoGroup}>
      <View style={styles.scheduleCard}>
        <View style={styles.scheduleTopRow}>
          <View style={styles.scheduleTimeBlock}>
            {loading ? (
              <>
                <ShimmerText width={96} height={28} />
                <ShimmerText width={190} height={24} />
              </>
            ) : (
              <>
                <Text style={styles.scheduleTitle}>{scheduleTitle(item)}</Text>
                <Text style={styles.scheduleTime} numberOfLines={1}>
                  {campaignDateLine(item)}
                </Text>
              </>
            )}
          </View>
          <View style={styles.scheduleIconBlock}>
            <Ionicons name="moon-outline" size={22} color="rgba(255,255,255,0.86)" />
          </View>
        </View>

        <View style={styles.scheduleDivider} />

        {loading ? (
          <View style={styles.scheduleLocationBlock}>
            <ShimmerText width={102} height={28} />
            <ShimmerText width="72%" height={23} />
          </View>
        ) : (
          <View style={styles.scheduleLocationBlock}>
            <Text selectable style={styles.scheduleLocationPrimary} numberOfLines={1}>
              {primary}
            </Text>
            {secondary ? (
              <Text selectable style={styles.scheduleLocationSecondary} numberOfLines={2}>
                {secondary}
              </Text>
            ) : null}
          </View>
        )}

        <View style={styles.mapPreview} accessibilityLabel={`Map preview for ${location}`}>
          <View style={[styles.mapPark, styles.mapParkTop]} />
          <View style={[styles.mapPark, styles.mapParkBottom]} />
          <View style={[styles.mapRoad, styles.mapRoadPrimary]} />
          <View style={[styles.mapRoad, styles.mapRoadSecondary]} />
          <View style={[styles.mapRoad, styles.mapRoadTertiary]} />
          <View style={[styles.mapRoadThin, styles.mapRoadThinOne]} />
          <View style={[styles.mapRoadThin, styles.mapRoadThinTwo]} />
          <Text style={styles.mapCityLabel} numberOfLines={1}>
            {primary}
          </Text>
          <Text style={styles.mapPlaceLabel} numberOfLines={1}>
            {secondary || 'Campaign location'}
          </Text>
          <View style={styles.mapPin}>
            <Ionicons name="location" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.mapBadge}>
            <Ionicons name="map" size={16} color="rgba(42,42,42,0.92)" />
            <Text style={styles.mapBadgeText}>Maps</Text>
          </View>
        </View>
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
  const imageUrl = cardImageUrl(item);
  const ownerImageUrl = brandImageUrl(item);
  const creatorProfileImage = creatorImageUrl(item);
  const brandName = item?.business_profile?.brand_name?.trim() || 'Plugoh brand';
  const creatorName = creatorDisplayName(item);
  const creatorProfileId = item?.influencer_profile?.id;
  const creatorProfileMeta = creatorMeta(item);
  const title = item ? item.ai_title?.trim() || item.title.trim() || 'Campaign' : 'Campaign';
  const brief = displayBrief(item?.brief);
  const heroHeight = Math.min(Math.max(window.height * 0.34, 280), 360);
  const titleFontSize = title.length > 42 ? 26 : title.length > 26 ? 30 : 34;
  const isResponding = mutations.acceptCampaign.isPending || mutations.declineCampaign.isPending;

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
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition="top center"
          />
        ) : (
          <LinearGradient
            colors={['#1B1D22', '#29242E', '#0E1115', '#050509']}
            locations={[0, 0.34, 0.68, 1]}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.34)', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0.28)', 'rgba(5,5,9,0.88)']}
          locations={[0, 0.38, 0.66, 1]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0)', 'rgba(5,5,9,0.58)']}
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
            <Ionicons name="chevron-back" size={25} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.titleBlock}>
          {campaignLoading ? (
            <>
              <ShimmerText width={Math.min(window.width - theme.spacing.jumbo, 360)} height={38} />
              <ShimmerText width={Math.min(window.width - theme.spacing.jumbo, 260)} height={38} />
            </>
          ) : (
            <Text
              selectable
              style={[
                styles.pageTitle,
                {
                  fontSize: titleFontSize,
                  lineHeight: titleFontSize + 4,
                },
              ]}
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              {title}
            </Text>
          )}
        </View>

        {canRespond ? (
          <View style={styles.actionRow}>
            <ActionPill
              label={mutations.declineCampaign.isPending ? 'Declining...' : 'Decline'}
              onPress={handleDecline}
              tint="decline"
              disabled={isResponding}
              accessibilityLabel={`Decline ${title}`}
            />
            <ActionPill
              label={mutations.acceptCampaign.isPending ? 'Accepting...' : 'Accept'}
              onPress={handleAccept}
              tint="accept"
              disabled={isResponding}
              accessibilityLabel={`Accept ${title}`}
            />
          </View>
        ) : null}

        {canDeliver ? (
          <View style={styles.actionRow}>
            <ActionPill
              label="Submit delivery"
              onPress={() => {
                router.push(`/(app)/delivery/${id}`);
              }}
              tint="accept"
              accessibilityLabel={`Submit delivery for ${title}`}
            />
          </View>
        ) : null}

        {canApprove ? (
          <View style={styles.actionRow}>
            <ActionPill
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
              tint="accept"
              disabled={mutations.approveCampaignDelivery.isPending}
              accessibilityLabel={`Approve delivery for ${title}`}
            />
            <ActionPill
              label="Dispute"
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
              tint="decline"
              disabled={mutations.disputeCampaignDelivery.isPending}
              accessibilityLabel={`Dispute delivery for ${title}`}
            />
          </View>
        ) : null}

        {role === 'business' ? (
          <InfoGroup title="Booked creator">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${creatorName} profile`}
              accessibilityState={{ disabled: campaignLoading || !creatorProfileId }}
              disabled={campaignLoading || !creatorProfileId}
              onPress={() => {
                if (!creatorProfileId) return;
                router.push(`/(app)/creator/${creatorProfileId}`);
              }}
              style={({ pressed }) => [styles.brandRow, pressed ? styles.pressed : null]}
            >
              <View style={styles.brandAvatar}>
                {campaignLoading ? (
                  <ShimmerCircle size={44} />
                ) : creatorProfileImage ? (
                  <Image
                    source={{ uri: creatorProfileImage }}
                    style={styles.brandAvatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={styles.brandAvatarInitial}>{initial(creatorName)}</Text>
                )}
              </View>
              <View style={styles.profileCopy}>
                <AsyncText
                  loading={campaignLoading}
                  value={creatorName}
                  selectable
                  style={styles.brandOwnerName}
                  numberOfLines={1}
                  shimmerWidth="52%"
                  shimmerHeight={24}
                />
                {campaignLoading ? (
                  <ShimmerText width="42%" height={14} />
                ) : creatorProfileMeta ? (
                  <Text style={styles.profileMeta} numberOfLines={1}>
                    {creatorProfileMeta}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={19} color="rgba(255,255,255,0.42)" />
            </Pressable>
          </InfoGroup>
        ) : (
          <InfoGroup title="Brand">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${brandName} profile`}
              accessibilityState={{ disabled: campaignLoading || !item }}
              disabled={campaignLoading || !item}
              onPress={() => {
                router.push(`/(app)/campaigns/${id}/brand`);
              }}
              style={({ pressed }) => [styles.brandRow, pressed ? styles.pressed : null]}
            >
              <View style={styles.brandAvatar}>
                {campaignLoading ? (
                  <ShimmerCircle size={44} />
                ) : ownerImageUrl ? (
                  <Image
                    source={{ uri: ownerImageUrl }}
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
                selectable
                style={styles.brandOwnerName}
                numberOfLines={1}
                shimmerWidth="52%"
                shimmerHeight={24}
              />
              <Ionicons name="chevron-forward" size={19} color="rgba(255,255,255,0.42)" />
            </Pressable>
          </InfoGroup>
        )}

        <InfoGroup title="Campaign details">
          <InfoLine
            icon="cash"
            label="Payout"
            value={formatCurrency(item?.price_offered)}
            loading={campaignLoading}
          />
          <InfoLine
            icon="sparkles"
            label="Package"
            value={formatPackageType(item?.package_type)}
            loading={campaignLoading}
          />
          <InfoLine
            icon="card"
            label="Payment"
            value={formatStatus(item?.payment_status)}
            loading={campaignLoading}
            isLast
          />
        </InfoGroup>

        <ScheduleCard item={item} loading={campaignLoading} />

        {campaignLoading ? (
          <InfoGroup title="Campaign brief">
            <View style={styles.briefSkeleton}>
              <ShimmerText width="92%" height={15} />
              <ShimmerText width="78%" height={15} />
            </View>
          </InfoGroup>
        ) : brief ? (
          <InfoGroup title="Campaign brief">
            <Text selectable style={styles.briefText}>
              {brief}
            </Text>
          </InfoGroup>
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
    justifyContent: 'flex-start',
    paddingHorizontal: theme.spacing.xxl,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  pressed: {
    opacity: 0.72,
  },
  body: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  titleBlock: {
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  pageTitle: {
    ...theme.typography.display,
    color: '#FFFFFF',
    fontWeight: '900',
    alignSelf: 'stretch',
    textAlign: 'left',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  actionGlass: {
    flex: 1,
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderRadius: 28,
    borderWidth: 1,
  },
  actionPressable: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: theme.spacing.md,
  },
  actionTint: {
    ...StyleSheet.absoluteFillObject,
  },
  actionText: {
    ...theme.typography.bodyStrong,
    fontWeight: '700',
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
  infoLine: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.09)',
  },
  brandRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  brandAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
  },
  brandAvatarImage: {
    width: '100%',
    height: '100%',
  },
  brandAvatarInitial: {
    ...theme.typography.cardTitle,
    color: '#111522',
    fontWeight: '900',
  },
  brandOwnerName: {
    ...theme.typography.cardTitle,
    flex: 1,
    minWidth: 0,
    color: '#FFFFFF',
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  profileMeta: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.48)',
  },
  infoLineLast: {
    borderBottomWidth: 0,
  },
  infoLineIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  infoLineCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  infoLineLabel: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.48)',
  },
  infoLineValue: {
    ...theme.typography.cardTitle,
    color: '#FFFFFF',
  },
  scheduleCard: {
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.055)',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  scheduleTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  scheduleTimeBlock: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing.xs,
  },
  scheduleTitle: {
    ...theme.typography.cardTitle,
    color: '#FFFFFF',
  },
  scheduleTime: {
    ...theme.typography.bodyStrong,
    fontWeight: '500',
    color: 'rgba(255,190,210,0.9)',
    fontVariant: ['tabular-nums'],
  },
  scheduleIconBlock: {
    width: 32,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  scheduleDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  scheduleLocationBlock: {
    gap: theme.spacing.xs,
  },
  scheduleLocationPrimary: {
    ...theme.typography.section,
    color: '#FFFFFF',
  },
  scheduleLocationSecondary: {
    ...theme.typography.bodyStrong,
    fontWeight: '500',
    color: 'rgba(255,190,210,0.86)',
  },
  mapPreview: {
    height: 112,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#F4F0EA',
    position: 'relative',
  },
  mapPark: {
    position: 'absolute',
    backgroundColor: '#CDEBC1',
    opacity: 0.95,
  },
  mapParkTop: {
    width: 120,
    height: 58,
    top: -14,
    left: -20,
    transform: [{ rotate: '-12deg' }],
  },
  mapParkBottom: {
    width: 120,
    height: 52,
    right: -22,
    bottom: -18,
    transform: [{ rotate: '10deg' }],
  },
  mapRoad: {
    position: 'absolute',
    height: 13,
    borderRadius: 99,
    backgroundColor: '#D8D3CA',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  mapRoadPrimary: {
    width: 320,
    top: 52,
    left: -34,
    transform: [{ rotate: '-18deg' }],
  },
  mapRoadSecondary: {
    width: 240,
    top: 32,
    right: -40,
    transform: [{ rotate: '29deg' }],
  },
  mapRoadTertiary: {
    width: 220,
    bottom: 20,
    left: 56,
    transform: [{ rotate: '8deg' }],
  },
  mapRoadThin: {
    position: 'absolute',
    height: 5,
    borderRadius: 99,
    backgroundColor: '#E2DDD5',
  },
  mapRoadThinOne: {
    width: 200,
    top: 14,
    left: 46,
    transform: [{ rotate: '-3deg' }],
  },
  mapRoadThinTwo: {
    width: 180,
    bottom: 40,
    left: -20,
    transform: [{ rotate: '34deg' }],
  },
  mapCityLabel: {
    ...theme.typography.section,
    position: 'absolute',
    top: 12,
    left: 92,
    right: 16,
    color: 'rgba(45,45,45,0.72)',
    fontWeight: '800',
  },
  mapPlaceLabel: {
    ...theme.typography.label,
    position: 'absolute',
    right: 12,
    bottom: 12,
    maxWidth: '50%',
    color: 'rgba(231,115,19,0.88)',
    fontWeight: '800',
    textAlign: 'right',
  },
  mapPin: {
    position: 'absolute',
    top: 34,
    left: '50%',
    width: 40,
    height: 40,
    marginLeft: -20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4255',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  mapBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapBadgeText: {
    ...theme.typography.bodyStrong,
    color: 'rgba(42,42,42,0.92)',
    fontWeight: '700',
  },
  briefText: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.76)',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  briefSkeleton: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
});
