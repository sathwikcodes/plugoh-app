import { router, useLocalSearchParams } from 'expo-router';
import coinImage from '@/assets/images/coin.png';
import postImage from '@/assets/images/post.png';
import reelImage from '@/assets/images/reel.png';
import { BlurView } from 'expo-blur';
import { Image, type ImageProps } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AppleMaps, GoogleMaps, type Coordinates } from 'expo-maps';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import {
  Alert,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text,
  View,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AsyncText, ShimmerCircle, ShimmerText } from '@/components/ui/shimmer';
import { TabScreenCanvas } from '@/components/ui/tab-screen-canvas';
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

function packageIconSource(pkg?: string): ImageProps['source'] | undefined {
  const value = pkg?.toLowerCase() ?? '';
  if (value.includes('reel')) return reelImage;
  if (value.includes('post') || value.includes('story')) return postImage;
  return undefined;
}

function formatCurrency(amount?: number) {
  if (amount == null) return 'Not set';
  return Math.round(amount).toLocaleString('en-IN');
}

function formatCampaignPayout(item?: CampaignListItem) {
  if (item?.price_offered_paise != null) {
    return formatCurrency(item.price_offered_paise / 100);
  }
  return formatCurrency(item?.price_offered);
}

function brandImageUrl(campaign?: CampaignListItem) {
  return (
    campaign?.business_profile?.profile_photo_url ||
    campaign?.business_profile?.ig_profile_picture_url ||
    campaign?.business_profile?.avatar_url ||
    undefined
  );
}

function brandOwnerEmail(campaign?: CampaignListItem) {
  return campaign?.business_profile?.email?.trim() || '';
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
    .filter((line) => !/^(Objective|Package|Timing|Due date|Venue|Place):/i.test(line.trim()))
    .join('\n')
    .trim();
}

function dateFromDateKey(value?: string) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function ordinalDay(day: number) {
  if (day > 3 && day < 21) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function formatFullDate(value?: string) {
  const date = dateFromDateKey(value);
  if (!date) return null;
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'long' });
  const month = date.toLocaleDateString('en-IN', { month: 'long' });
  return `${weekday}, ${ordinalDay(date.getDate())} ${month} ${date.getFullYear()}`;
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

function formatTimingLine(value?: string | null) {
  if (!value) return null;
  const dueDateMatch = /\b(\d{4}-\d{2}-\d{2})\b/.exec(value);
  if (dueDateMatch) return formatFullDate(dueDateMatch[1]) ?? dueDateMatch[1];
  if (value === 'asap') return 'ASAP';
  if (value === 'choose_date') return null;
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function campaignDateLine(item?: CampaignListItem) {
  if (!item) return 'Timing not specified';
  const dueDate = formatFullDate(item.due_date);
  if (dueDate) return dueDate;
  const timing = parseBriefValue(item.brief, 'Timing');
  const formattedTiming = formatTimingLine(timing);
  if (formattedTiming) return formattedTiming;
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
    parseBriefValue(item?.brief, 'Place') ||
    item?.place_name?.trim() ||
    item?.business_profile?.brand_location?.trim() ||
    'Location not specified'
  );
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

function coordinatePair(item?: CampaignListItem): Coordinates | null {
  const latitude = Number(item?.place_latitude ?? item?.business_profile?.brand_latitude);
  const longitude = Number(item?.place_longitude ?? item?.business_profile?.brand_longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function weatherIconName(condition?: string, isDaytime = true): keyof typeof Ionicons.glyphMap {
  const value = condition?.toLowerCase() ?? '';
  if (value.includes('thunder')) return 'thunderstorm-outline';
  if (value.includes('rain') || value.includes('drizzle') || value.includes('shower')) {
    return 'rainy-outline';
  }
  if (value.includes('snow') || value.includes('sleet') || value.includes('hail')) {
    return 'snow-outline';
  }
  if (value.includes('cloud') || value.includes('overcast') || value.includes('fog')) {
    return isDaytime ? 'partly-sunny-outline' : 'cloudy-night-outline';
  }
  return isDaytime ? 'sunny-outline' : 'moon-outline';
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

function actionIconForStatus(status?: string): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case 'completed':
      return 'checkmark-done';
    case 'delivery_submitted':
      return 'cloud-done';
    case 'in_escrow':
      return 'lock-closed';
    case 'requested':
    case 'payment_pending':
    case 'pre_authorized':
      return 'hourglass-outline';
    case 'declined':
    case 'expired':
    case 'cancelled':
    case 'disputed':
      return 'alert-circle-outline';
    default:
      return 'sparkles';
  }
}

function CampaignLiquidSurface({
  children,
  style,
}: {
  children: ReactNode;
  style: StyleProp<ViewStyle>;
}) {
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView isInteractive glassEffectStyle="regular" colorScheme="dark" style={style}>
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView tint="systemUltraThinMaterialDark" intensity={80} style={style}>
      {children}
    </BlurView>
  );
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
  const tintOverlayColor = tint === 'accept' ? 'rgba(35, 174, 97, 0.2)' : 'rgba(230, 70, 70, 0.2)';
  const borderColor = tint === 'accept' ? 'rgba(94, 255, 168, 0.28)' : 'rgba(255, 126, 126, 0.28)';
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

  return <CampaignLiquidSurface style={shellStyle}>{content}</CampaignLiquidSurface>;
}

function QuickActionTile({
  icon,
  label,
  onPress,
  disabled,
  active,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  active?: boolean;
  accessibilityLabel: string;
}) {
  const content = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.quickActionPressable,
        pressed && !disabled ? styles.pressed : null,
        active ? styles.quickActionPressableActive : null,
      ]}
    >
      <View pointerEvents="none" style={styles.quickActionInnerStroke} />
      <Ionicons name={icon} size={20} color={disabled ? 'rgba(255,255,255,0.34)' : '#FFFFFF'} />
      <Text
        style={[styles.quickActionText, disabled ? styles.quickActionTextDisabled : null]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <CampaignLiquidSurface
      style={[styles.quickActionGlass, active ? styles.quickActionGlassActive : null]}
    >
      {content}
    </CampaignLiquidSurface>
  );
}

function ProfileGlassTab({
  name,
  meta,
  imageUrl,
  fallbackInitial,
  loading,
  disabled,
  onPress,
  accessibilityLabel,
}: {
  name: string;
  meta?: string;
  imageUrl?: string;
  fallbackInitial: string;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel: string;
}) {
  const secondaryText = meta?.trim() || 'No email provided';
  const content = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.profileTabPressable,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.profileTabDisabled : null,
      ]}
    >
      <View pointerEvents="none" style={styles.profileTabInnerStroke} />
      <View style={styles.brandAvatar}>
        {loading ? (
          <ShimmerCircle size={42} />
        ) : imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.brandAvatarImage} contentFit="cover" />
        ) : (
          <Text style={styles.brandAvatarInitial}>{fallbackInitial}</Text>
        )}
      </View>
      <View style={styles.profileCopy}>
        <AsyncText
          loading={Boolean(loading)}
          value={name}
          selectable
          style={styles.brandOwnerName}
          numberOfLines={1}
          shimmerWidth="56%"
          shimmerHeight={20}
        />
        {loading ? (
          <ShimmerText width="48%" height={14} />
        ) : (
          <Text selectable style={styles.profileMeta} numberOfLines={1}>
            {secondaryText}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.5)" />
    </Pressable>
  );

  return <CampaignLiquidSurface style={styles.profileTabGlass}>{content}</CampaignLiquidSurface>;
}

function CampaignFactLine({
  icon,
  image,
  value,
  loading,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  image?: ImageProps['source'];
  value: string;
  loading?: boolean;
}) {
  return (
    <View style={styles.campaignFactLine}>
      <View style={styles.campaignFactIcon}>
        {image ? (
          <Image source={image} style={styles.campaignFactImage} contentFit="contain" />
        ) : icon ? (
          <Ionicons name={icon} size={18} color="rgba(255,255,255,0.78)" />
        ) : null}
      </View>
      <AsyncText
        loading={Boolean(loading)}
        value={value}
        selectable
        style={styles.campaignFactText}
        numberOfLines={2}
        shimmerWidth="66%"
        shimmerHeight={18}
      />
    </View>
  );
}

function LocationMapCard({ item, loading }: { item?: CampaignListItem; loading?: boolean }) {
  const location = campaignLocation(item);
  const { primary, secondary } = locationParts(location);
  const coordinates = coordinatePair(item);
  const weather = item?.location_weather;
  const cameraPosition = coordinates ? { coordinates, zoom: 15 } : undefined;
  const markers = coordinates
    ? [
        {
          id: 'campaign-location',
          coordinates,
          title: location,
        },
      ]
    : [];

  return (
    <View style={styles.locationSection}>
      <Text style={styles.groupTitle}>Location</Text>
      <View style={styles.sectionDivider} />
      <View style={styles.locationMetaRow}>
        {loading ? (
          <View style={styles.locationTextBlock}>
            <ShimmerText width={190} height={26} />
            <ShimmerText width={160} height={22} />
          </View>
        ) : (
          <View style={styles.locationTextBlock}>
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
        {weather ? (
          <View
            style={styles.weatherBlock}
            accessibilityLabel={
              weather.condition
                ? `${Math.round(weather.temperature_celsius)} degrees Celsius, ${weather.condition}`
                : `${Math.round(weather.temperature_celsius)} degrees Celsius`
            }
          >
            <Ionicons
              name={weatherIconName(weather.condition, weather.is_daytime ?? true)}
              size={24}
              color="rgba(255,255,255,0.9)"
            />
            <Text style={styles.weatherTemp} numberOfLines={1}>
              {Math.round(weather.temperature_celsius)}°C
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.locationCard}>
        {loading ? (
          <View style={styles.mapLoading}>
            <ShimmerText width="64%" height={18} />
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
              rotationGesturesEnabled: false,
              tiltGesturesEnabled: false,
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
  const brandEmail = brandOwnerEmail(item);
  const creatorProfileImage = creatorImageUrl(item);
  const brandName = item?.business_profile?.brand_name?.trim() || 'Plugoh brand';
  const creatorName = creatorDisplayName(item);
  const creatorProfileId = item?.influencer_profile?.id;
  const creatorProfileMeta = creatorMeta(item);
  const title = item ? item.ai_title?.trim() || item.title.trim() || 'Campaign' : 'Campaign';
  const brief = displayBrief(item?.brief);
  const heroHeight = Math.min(Math.max(window.width * 0.48, 154), 204);
  const titleFontSize = title.length > 42 ? 22 : title.length > 26 ? 24 : 27;
  const isResponding = mutations.acceptCampaign.isPending || mutations.declineCampaign.isPending;
  const campaignTime = campaignDateLine(item);
  const objective =
    parseBriefValue(item?.brief, 'Objective') || item?.objective || formatStatus(item?.status);

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
        <View style={[styles.hero, { height: heroHeight }]}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="center"
            />
          ) : (
            <LinearGradient
              colors={['#FFFDE7', '#F8D7FF', '#8EC5D6', '#F8DF67']}
              locations={[0, 0.38, 0.68, 1]}
              start={{ x: 0.08, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <LinearGradient
            colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.12)']}
            locations={[0, 0.48, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.heroControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => {
                router.back();
              }}
              style={({ pressed }) => [styles.circleButton, pressed ? styles.pressed : null]}
            >
              <Ionicons name="chevron-back" size={21} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleBlock}>
            {campaignLoading ? (
              <>
                <ShimmerText
                  width={Math.min(window.width - theme.spacing.jumbo, 360)}
                  height={30}
                />
                <ShimmerText
                  width={Math.min(window.width - theme.spacing.jumbo, 260)}
                  height={20}
                />
              </>
            ) : (
              <>
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
                <Text selectable style={styles.dateLine} numberOfLines={2}>
                  {campaignTime}
                </Text>
              </>
            )}
          </View>

          <View style={styles.quickActionRow}>
            <QuickActionTile
              icon={role === 'business' ? 'person-add' : 'business'}
              label={role === 'business' ? 'Creator' : 'Brand'}
              active
              accessibilityLabel={role === 'business' ? `View ${creatorName}` : `View ${brandName}`}
              disabled={campaignLoading || (role === 'business' ? !creatorProfileId : !item)}
              onPress={() => {
                if (role === 'business') {
                  if (!creatorProfileId) return;
                  router.push(`/(app)/creator/${creatorProfileId}`);
                  return;
                }
                router.push(`/(app)/campaigns/${id}/brand`);
              }}
            />
            <QuickActionTile
              icon="chatbubble-ellipses"
              label="Chat"
              accessibilityLabel={`Open chat for ${title}`}
              disabled={campaignLoading || !item}
              onPress={() => {
                router.push(`/(app)/inbox/${id}`);
              }}
            />
            <QuickActionTile
              icon={canApprove ? 'checkmark-done' : 'cloud-upload'}
              label={canApprove ? 'Review' : 'Deliver'}
              accessibilityLabel={canApprove ? `Review ${title}` : `Deliver ${title}`}
              disabled={campaignLoading || (!canDeliver && !canApprove)}
              onPress={() => {
                if (canApprove) return;
                router.push(`/(app)/delivery/${id}`);
              }}
            />
            <QuickActionTile
              icon={actionIconForStatus(item?.status)}
              label="Status"
              accessibilityLabel={`Campaign status is ${formatStatus(item?.status)}`}
              disabled={campaignLoading}
              onPress={() => {
                Alert.alert('Campaign status', formatStatus(item?.status));
              }}
            />
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

          {campaignLoading ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>Description</Text>
              <View style={styles.sectionDivider} />
              <View style={styles.briefSkeleton}>
                <ShimmerText width="92%" height={15} />
                <ShimmerText width="78%" height={15} />
              </View>
            </View>
          ) : brief ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>Description</Text>
              <View style={styles.sectionDivider} />
              <Text selectable style={styles.descriptionText}>
                {brief}
              </Text>
            </View>
          ) : null}

          <View style={styles.campaignFacts}>
            <CampaignFactLine
              image={coinImage}
              value={formatCampaignPayout(item)}
              loading={campaignLoading}
            />
            <CampaignFactLine
              icon="logo-instagram"
              image={packageIconSource(item?.package_type)}
              value={formatPackageType(item?.package_type)}
              loading={campaignLoading}
            />
            <CampaignFactLine icon="flag" value={objective} loading={campaignLoading} />
            <CampaignFactLine
              icon="lock-closed"
              value={`${formatStatus(item?.status)} · ${formatStatus(item?.payment_status)}`}
              loading={campaignLoading}
            />
          </View>

          {role === 'business' ? (
            <View style={styles.brandLinkSection}>
              <ProfileGlassTab
                name={creatorName}
                meta={creatorProfileMeta}
                imageUrl={creatorProfileImage}
                fallbackInitial={initial(creatorName)}
                loading={campaignLoading}
                disabled={campaignLoading || !creatorProfileId}
                accessibilityLabel={`View ${creatorName} profile`}
                onPress={() => {
                  if (!creatorProfileId) return;
                  router.push(`/(app)/creator/${creatorProfileId}`);
                }}
              />
            </View>
          ) : (
            <View style={styles.brandLinkSection}>
              <ProfileGlassTab
                name={brandName}
                meta={brandEmail}
                imageUrl={ownerImageUrl}
                fallbackInitial={initial(brandName)}
                loading={campaignLoading}
                disabled={campaignLoading || !item}
                accessibilityLabel={`View ${brandName} profile`}
                onPress={() => {
                  router.push(`/(app)/campaigns/${id}/brand`);
                }}
              />
            </View>
          )}

          <LocationMapCard item={item} loading={campaignLoading} />
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
  hero: {
    marginHorizontal: theme.spacing.xl,
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderRadius: 24,
    backgroundColor: '#F8F4D2',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
  },
  heroControls: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  pressed: {
    opacity: 0.72,
  },
  body: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  titleBlock: {
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    paddingHorizontal: 0,
  },
  pageTitle: {
    ...theme.typography.headline,
    color: '#FFFFFF',
    fontWeight: '500',
    alignSelf: 'stretch',
    textAlign: 'left',
  },
  dateLine: {
    ...theme.typography.bodyStrong,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.spacing.sm,
  },
  quickActionGlass: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'transparent',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 1,
  },
  quickActionGlassActive: {
    borderColor: 'rgba(255,255,255,0.24)',
    shadowOpacity: 0.24,
    shadowRadius: 18,
  },
  quickActionPressable: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 6,
    position: 'relative',
  },
  quickActionPressableActive: {
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  quickActionInnerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  quickActionText: {
    ...theme.typography.labelSmall,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  quickActionTextDisabled: {
    color: 'rgba(255,255,255,0.34)',
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
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  actionPressable: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: theme.spacing.md,
  },
  actionTint: {
    ...StyleSheet.absoluteFillObject,
  },
  actionText: {
    ...theme.typography.callout,
    fontWeight: '700',
  },
  descriptionSection: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  descriptionTitle: {
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
  campaignFacts: {
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  campaignFactLine: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  campaignFactIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  campaignFactImage: {
    width: 24,
    height: 24,
  },
  campaignFactText: {
    ...theme.typography.bodyStrong,
    flex: 1,
    minWidth: 0,
    color: 'rgba(255,255,255,0.84)',
    fontWeight: '600',
  },
  infoGroup: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  groupTitle: {
    ...theme.typography.headline,
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
  },
  infoRows: {
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.075)',
  },
  infoLine: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.09)',
  },
  profileTabGlass: {
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'transparent',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 1,
  },
  profileTabPressable: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    position: 'relative',
  },
  profileTabDisabled: {
    opacity: 0.62,
  },
  profileTabInnerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  brandLinkSection: {
    paddingVertical: theme.spacing.xs,
  },
  brandAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.44)',
  },
  brandAvatarImage: {
    width: '100%',
    height: '100%',
  },
  brandAvatarInitial: {
    ...theme.typography.callout,
    color: '#111522',
    fontWeight: '900',
  },
  brandOwnerName: {
    ...theme.typography.callout,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 21,
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 2,
  },
  profileMeta: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.66)',
    lineHeight: 17,
  },
  infoLineLast: {
    borderBottomWidth: 0,
  },
  infoLineIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
  locationSection: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  locationMetaRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  locationTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
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
  weatherBlock: {
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  weatherTemp: {
    ...theme.typography.callout,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
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
  mapLoading: {
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
  briefSkeleton: {
    gap: theme.spacing.sm,
  },
});
