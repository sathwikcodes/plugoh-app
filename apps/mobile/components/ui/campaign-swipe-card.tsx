import { CAMPAIGN_CARD_CORNER_RADIUS } from '@/constants/campaign-card-frame';
import { theme } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { CampaignListItem } from '@plugoh/contracts';
import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { CampaignDeckRole } from './campaign-deck-swiper';

type Props = {
  role: CampaignDeckRole;
  campaign: CampaignListItem;
  cardWidth: number;
  cardHeight: number;
  style?: ViewStyle;
  onViewPress?: () => void;
  onAcceptPress?: () => void;
  onDeclinePress?: () => void;
  acceptPending?: boolean;
  declinePending?: boolean;
};

const ACTIONABLE_STATUSES = new Set(['requested', 'pre_authorized']);
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function formatBudget(amount?: number) {
  if (amount == null) return null;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatPackageType(pkg?: string) {
  if (!pkg) return null;
  return pkg
    .replaceAll('_', ' ')
    .replaceAll('+', ' + ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatStatus(status?: string) {
  if (!status) return 'Campaign';
  return status.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function initial(value: string) {
  return value.trim().charAt(0).toUpperCase() || 'P';
}

function firstImageUrl(...candidates: (string | undefined)[]) {
  return candidates.find((candidate) => Boolean(candidate?.trim()))?.trim();
}

function businessProfileImageUrl(campaign: CampaignListItem) {
  return firstImageUrl(
    campaign.business_profile?.profile_photo_url,
    campaign.business_profile?.ig_profile_picture_url,
    campaign.business_profile?.avatar_url,
  );
}

function influencerProfileImageUrl(campaign: CampaignListItem) {
  return firstImageUrl(
    campaign.influencer_profile?.profile_photo_url,
    campaign.influencer_profile?.avatar_url,
  );
}

function cardImageUrl(campaign: CampaignListItem) {
  return firstImageUrl(campaign.card_image_url, businessProfileImageUrl(campaign));
}

function influencerBookedLine(campaign: CampaignListItem) {
  const packageType = formatPackageType(campaign.package_type);
  const price = formatBudget(campaign.price_offered);
  if (packageType && price) return `Booked ${packageType} for ${price}`;
  if (packageType) return `Booked ${packageType}`;
  if (price) return `Booked for ${price}`;
  return 'Booked campaign';
}

function creatorName(campaign: CampaignListItem) {
  return (
    campaign.influencer_profile?.display_name?.trim() ||
    campaign.influencer_profile?.ig_username?.trim() ||
    'Creator'
  );
}

function brandBookedLine(campaign: CampaignListItem) {
  const packageType = formatPackageType(campaign.package_type);
  const price = formatBudget(campaign.price_offered);
  const parts = [creatorName(campaign), packageType, price].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Booked campaign';
}

function formatExpiryLabel(expiresAt: string | undefined, now: number) {
  if (!expiresAt) return null;
  const expiresTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresTime)) return null;
  const remaining = expiresTime - now;
  if (remaining <= 0) return 'Expired';
  if (remaining < HOUR_MS) return `${Math.ceil(remaining / MINUTE_MS)}m left`;
  if (remaining < DAY_MS) return `${Math.ceil(remaining / HOUR_MS)}h left`;
  return `${Math.ceil(remaining / DAY_MS)}d left`;
}

function statusIcon(status?: string): ComponentProps<typeof Ionicons>['name'] {
  switch (status) {
    case 'completed':
      return 'checkmark-circle';
    case 'delivery_submitted':
      return 'paper-plane';
    case 'in_escrow':
      return 'lock-closed';
    case 'payment_pending':
    case 'pre_authorized':
      return 'card';
    case 'requested':
      return 'sparkles';
    case 'disputed':
      return 'alert-circle';
    case 'declined':
    case 'cancelled':
    case 'refunded':
      return 'close-circle';
    case 'expired':
      return 'hourglass';
    default:
      return 'ellipse';
  }
}

function InviteGlassButton({
  label,
  onPress,
  disabled,
  tint,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  tint: 'accept' | 'decline';
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
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
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

function StatusGlassPill({
  icon,
  label,
  borderColor,
  minHeight,
  paddingHorizontal,
  gap,
  iconSize,
  fontSize,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  borderColor: string;
  minHeight: number;
  paddingHorizontal: number;
  gap: number;
  iconSize: number;
  fontSize: number;
}) {
  const shellStyle = [
    styles.statusPillShell,
    {
      minHeight,
      borderRadius: theme.radius.pill,
      borderColor,
    },
  ];
  const content = (
    <View
      style={[
        styles.statusPillInner,
        {
          minHeight,
          paddingHorizontal,
          gap,
        },
      ]}
    >
      <Ionicons name={icon} size={iconSize} color="rgba(255,255,255,0.94)" />
      <Text style={[styles.statusPillText, { fontSize }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  return (
    <View style={shellStyle}>
      <BlurView tint="systemUltraThinMaterialDark" intensity={72} style={styles.statusPillBlur} />
      {content}
    </View>
  );
}

export function CampaignSwipeCard({
  role,
  campaign,
  cardWidth,
  cardHeight,
  style,
  onViewPress,
  onAcceptPress,
  onDeclinePress,
  acceptPending,
  declinePending,
}: Props) {
  const scale = Math.min(cardWidth / 360, cardHeight / 560);
  const px = (value: number) => Math.round(value * scale);
  const [now, setNow] = useState(() => Date.now());
  const brandName = campaign.business_profile?.brand_name?.trim() || 'Plugoh brand';
  const displayIdentity = role === 'business' ? creatorName(campaign) : brandName;
  const ownerImageUrl =
    role === 'business' ? influencerProfileImageUrl(campaign) : businessProfileImageUrl(campaign);
  const imageUrl = cardImageUrl(campaign);
  const title = campaign.ai_title?.trim() || campaign.title.trim() || brandName;
  const detailLine =
    role === 'business' ? brandBookedLine(campaign) : influencerBookedLine(campaign);
  const expiryLabel = useMemo(
    () => formatExpiryLabel(campaign.expires_at, now),
    [campaign.expires_at, now],
  );
  const isExpired = expiryLabel === 'Expired';
  const hasActiveTimer = Boolean(expiryLabel && !isExpired);
  const badgeLabel = hasActiveTimer && expiryLabel ? expiryLabel : formatStatus(campaign.status);
  const badgeBorderColor = 'rgba(255,255,255,0.2)';
  const badgeIcon = hasActiveTimer ? 'time-outline' : statusIcon(campaign.status);
  const isActionable =
    role === 'influencer' && ACTIONABLE_STATUSES.has(campaign.status) && !isExpired;
  const isMutating = Boolean(acceptPending || declinePending);
  const actionRowHeight = px(56);
  const bottomContentPadding = isActionable ? px(104) : px(36);

  useEffect(() => {
    if (!campaign.expires_at) return undefined;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, MINUTE_MS);
    return () => {
      clearInterval(interval);
    };
  }, [campaign.expires_at]);

  return (
    <View style={[styles.wrapper, { width: cardWidth, height: cardHeight }, style]}>
      <View
        style={[
          styles.shell,
          {
            width: cardWidth,
            height: cardHeight,
            borderRadius: CAMPAIGN_CARD_CORNER_RADIUS,
          },
        ]}
      >
        {imageUrl ? (
          <ImageBackground
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            imageStyle={styles.backgroundImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.fallbackBackground} />
        )}

        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(0,0,0,0)',
            'rgba(10,12,16,0)',
            'rgba(10,12,16,0.15)',
            'rgba(10,12,16,0.45)',
            'rgba(10,12,16,0.78)',
            'rgba(10,12,16,0.97)',
          ]}
          locations={[0, 0.25, 0.42, 0.58, 0.72, 1]}
          style={styles.backgroundGradient}
        />

        <MaskedView
          pointerEvents="none"
          style={styles.bottomFogMask}
          maskElement={
            <LinearGradient
              colors={[
                'rgba(0,0,0,0)',
                'rgba(0,0,0,0.12)',
                'rgba(0,0,0,0.42)',
                'rgba(0,0,0,0.78)',
                'rgba(0,0,0,1)',
              ]}
              locations={[0, 0.24, 0.52, 0.76, 1]}
              style={StyleSheet.absoluteFill}
            />
          }
        >
          <BlurView tint="dark" intensity={14} style={StyleSheet.absoluteFill} />
        </MaskedView>

        <Pressable
          onPress={onViewPress}
          accessibilityRole="button"
          accessibilityLabel={`View ${title}`}
          style={({ pressed }) => [styles.cardHitArea, pressed ? styles.cardPressed : null]}
        />

        <View style={[styles.topRow, { padding: px(20) }]}>
          <StatusGlassPill
            icon={badgeIcon}
            label={badgeLabel}
            borderColor={badgeBorderColor}
            minHeight={px(34)}
            paddingHorizontal={px(12)}
            gap={px(6)}
            iconSize={px(14)}
            fontSize={px(12)}
          />
        </View>

        <View
          style={[
            styles.content,
            {
              paddingHorizontal: px(26),
              paddingBottom: bottomContentPadding,
              gap: px(9),
            },
          ]}
        >
          <View
            style={[
              styles.contentAvatarFrame,
              {
                width: px(54),
                height: px(54),
                borderRadius: px(27),
              },
            ]}
          >
            {ownerImageUrl ? (
              <Image
                source={{ uri: ownerImageUrl }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <Text style={[styles.avatarInitial, { fontSize: px(22) }]}>
                {initial(displayIdentity)}
              </Text>
            )}
          </View>
          <Text
            selectable
            style={[
              styles.title,
              {
                fontSize: px(title.length > 30 ? 28 : 34),
                lineHeight: px(title.length > 30 ? 33 : 40),
              },
            ]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
          >
            {title}
          </Text>
          <Text
            style={[styles.detailLine, { fontSize: px(15), lineHeight: px(21) }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {detailLine}
          </Text>
        </View>

        {isActionable ? (
          <View
            style={[
              styles.actionRow,
              {
                height: actionRowHeight,
                gap: px(10),
                left: px(22),
                right: px(22),
                bottom: px(24),
              },
            ]}
          >
            <InviteGlassButton
              label={declinePending ? 'Declining...' : 'Decline'}
              tint="decline"
              disabled={isMutating}
              onPress={onDeclinePress}
              accessibilityLabel={`Decline ${title}`}
            />
            <InviteGlassButton
              label={acceptPending ? 'Accepting...' : 'Accept'}
              tint="accept"
              disabled={isMutating}
              onPress={onAcceptPress}
              accessibilityLabel={`Accept ${title}`}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  shell: {
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: '#050509',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 16,
  },
  fallbackBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#202322',
  },
  backgroundImage: {
    borderRadius: CAMPAIGN_CARD_CORNER_RADIUS,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomFogMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  cardHitArea: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
  },
  cardPressed: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  topRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  contentAvatarFrame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.78)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    color: '#111522',
    fontWeight: '900',
  },
  statusPillShell: {
    flexShrink: 0,
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  statusPillBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  statusPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  statusPillText: {
    color: 'rgba(255,255,255,0.94)',
    fontWeight: '700',
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontFamily: theme.typography.display.fontFamily,
    fontWeight: '400',
    letterSpacing: 0,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.42)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  detailLine: {
    color: 'rgba(255,255,255,0.68)',
    fontWeight: '400',
    letterSpacing: 0,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.36)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  description: {
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '500',
    letterSpacing: 0,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.38)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 9,
  },
  actionRow: {
    position: 'absolute',
    zIndex: 4,
    flexDirection: 'row',
  },
  actionGlass: {
    flex: 1,
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderRadius: 28,
    borderWidth: 1,
  },
  actionPressable: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  actionTint: {
    ...StyleSheet.absoluteFillObject,
  },
  actionText: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.82,
  },
});
