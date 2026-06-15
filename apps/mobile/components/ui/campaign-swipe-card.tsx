import completedCardHeroImage from '@/assets/images/completed_card.png';
import deliveryCardHeroImage from '@/assets/images/delivery_card.png';
import requestedCardHeroImage from '@/assets/images/requested_card.png';
import { CAMPAIGN_CARD_CORNER_RADIUS } from '@/constants/campaign-card-frame';
import { theme } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { CampaignListItem } from '@plugoh/contracts';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MeshGradientView } from 'expo-mesh-gradient';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { CampaignDeckRole } from './campaign-deck-swiper';

type Props = {
  role: CampaignDeckRole;
  campaign: CampaignListItem;
  cardWidth: number;
  cardHeight: number;
  style?: ViewStyle;
  onViewPress?: () => void;
};

const ACTIONABLE_STATUSES = new Set(['requested', 'pre_authorized']);
const SECOND_MS = 1_000;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const COUNTDOWN_SEGMENTS = ['hours', 'minutes', 'seconds'] as const;

type CampaignStatus = CampaignListItem['status'];
type CampaignCardGradientFamily = 'requested' | 'accepted' | 'action';
type CampaignCardHeroFamily = 'requested' | 'delivery' | 'completed' | null;

type CampaignCardGradientTone = {
  baseColor: string;
  meshColors: readonly string[];
  topSheen: readonly [string, string, string];
  edgeShadowColor: string;
};

const CAMPAIGN_CARD_MESH_POINTS = [
  [0.0, 0.0],
  [0.5, 0.0],
  [1.0, 0.0],
  [0.0, 0.5],
  [0.62, 0.4],
  [1.0, 0.5],
  [0.0, 1.0],
  [0.5, 1.0],
  [1.0, 1.0],
] as const;

const CAMPAIGN_CARD_GRADIENT_TONES = {
  requested: {
    baseColor: '#FFB46B',
    meshColors: [
      '#FF6BC8',
      '#FF8DDF',
      '#FFE06A',
      '#FF5FBB',
      '#FFA45A',
      '#FFD238',
      '#E64FA8',
      '#FF8F2E',
      '#FFB13D',
    ],
    topSheen: ['rgba(255,255,255,0.34)', 'rgba(255,216,77,0.12)', 'rgba(255,255,255,0)'],
    edgeShadowColor: 'rgba(92, 20, 46, 0.42)',
  },
  accepted: {
    baseColor: '#FFB46B',
    meshColors: [
      '#5CF7B0',
      '#A3FFD0',
      '#FFE06A',
      '#45E992',
      '#FFAD5C',
      '#FFD238',
      '#26B96D',
      '#FF8F2E',
      '#FFB13D',
    ],
    topSheen: ['rgba(249,255,209,0.32)', 'rgba(255,216,77,0.12)', 'rgba(255,255,255,0)'],
    edgeShadowColor: 'rgba(16, 76, 38, 0.42)',
  },
  action: {
    baseColor: '#FFAA67',
    meshColors: [
      '#FF7FA2',
      '#FF9AB5',
      '#FFE06A',
      '#F76778',
      '#FFA45A',
      '#FFC238',
      '#B94A54',
      '#F27636',
      '#FF9430',
    ],
    topSheen: ['rgba(255,240,194,0.34)', 'rgba(255,210,77,0.12)', 'rgba(255,255,255,0)'],
    edgeShadowColor: 'rgba(88, 30, 20, 0.44)',
  },
} satisfies Record<CampaignCardGradientFamily, CampaignCardGradientTone>;

type StatusPillTone = {
  surfaceColor: string;
  borderColor: string;
  innerBorderColor: string;
  iconBackgroundColor: string;
  iconColor: string;
  textColor: string;
};

const STATUS_PILL_TONES = {
  success: {
    surfaceColor: 'rgba(38, 61, 41, 0.72)',
    borderColor: 'rgba(230, 255, 216, 0.2)',
    innerBorderColor: 'rgba(255, 255, 255, 0.06)',
    iconBackgroundColor: '#70D960',
    iconColor: '#1D5A25',
    textColor: '#FFFFFF',
  },
  warning: {
    surfaceColor: 'rgba(72, 57, 31, 0.72)',
    borderColor: 'rgba(255, 235, 172, 0.22)',
    innerBorderColor: 'rgba(255, 255, 255, 0.06)',
    iconBackgroundColor: '#F2C94D',
    iconColor: '#6D4910',
    textColor: '#FFFFFF',
  },
  danger: {
    surfaceColor: 'rgba(69, 34, 34, 0.72)',
    borderColor: 'rgba(255, 196, 196, 0.2)',
    innerBorderColor: 'rgba(255, 255, 255, 0.06)',
    iconBackgroundColor: '#F06D6D',
    iconColor: '#611C1C',
    textColor: '#FFFFFF',
  },
  neutral: {
    surfaceColor: 'rgba(43, 48, 54, 0.72)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    innerBorderColor: 'rgba(255, 255, 255, 0.06)',
    iconBackgroundColor: 'rgba(255,255,255,0.82)',
    iconColor: '#334155',
    textColor: '#FFFFFF',
  },
} satisfies Record<string, StatusPillTone>;

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

function remainingSecondsUntil(expiresAt: string | undefined, now: number) {
  if (!expiresAt) return null;
  const expiresTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresTime)) return null;
  return Math.max(0, Math.ceil((expiresTime - now) / SECOND_MS));
}

function countdownTimeParts(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours: String(Math.min(hours, 99)).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}

function useReduceMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      subscription.remove();
    };
  }, []);

  return reduced;
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
    case 'capture_pending':
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

function statusPillTone(status: CampaignStatus | undefined, hasActiveTimer: boolean) {
  if (hasActiveTimer) return STATUS_PILL_TONES.warning;

  switch (status) {
    case 'completed':
      return STATUS_PILL_TONES.success;
    case 'requested':
    case 'payment_pending':
    case 'pre_authorized':
    case 'capture_pending':
      return STATUS_PILL_TONES.warning;
    case 'disputed':
    case 'declined':
    case 'expired':
    case 'cancelled':
    case 'refunded':
      return STATUS_PILL_TONES.danger;
    default:
      return STATUS_PILL_TONES.neutral;
  }
}

function campaignCardGradientFamily(
  status: CampaignStatus | undefined,
  role: CampaignDeckRole,
): CampaignCardGradientFamily {
  switch (status) {
    case 'requested':
    case 'payment_pending':
    case 'pre_authorized':
      return 'requested';
    case 'changes_requested':
    case 'declined':
    case 'disputed':
    case 'expired':
    case 'cancelled':
    case 'refunded':
      return 'action';
    case 'in_escrow':
      return role === 'influencer' ? 'action' : 'accepted';
    case 'capture_pending':
    case 'delivery_submitted':
    case 'completed':
      return 'accepted';
    default:
      return 'requested';
  }
}

function campaignCardHeroFamily(status: CampaignStatus | undefined): CampaignCardHeroFamily {
  switch (status) {
    case 'requested':
    case 'payment_pending':
    case 'pre_authorized':
      return 'requested';
    case 'capture_pending':
    case 'in_escrow':
      return 'delivery';
    case 'completed':
      return 'completed';
    default:
      return null;
  }
}

function StatusGlassPill({
  icon,
  label,
  tone,
  minHeight,
  paddingHorizontal,
  gap,
  iconSize,
  fontSize,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  tone: StatusPillTone;
  minHeight: number;
  paddingHorizontal: number;
  gap: number;
  iconSize: number;
  fontSize: number;
}) {
  const iconBubbleSize = Math.max(18, Math.round(iconSize + 2));
  const iconGlyphSize = Math.max(10, Math.round(iconBubbleSize * 0.56));
  const shellStyle = [
    styles.statusPillShell,
    {
      minHeight,
      borderRadius: theme.radius.pill,
    },
  ];
  const frameStyle = [
    styles.statusPillFrame,
    {
      minHeight,
      borderRadius: theme.radius.pill,
      borderColor: tone.borderColor,
      backgroundColor: tone.surfaceColor,
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
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.08)']}
        locations={[0, 0.46, 1]}
        style={styles.statusPillMatteWash}
      />
      <View
        pointerEvents="none"
        style={[styles.statusPillInnerStroke, { borderColor: tone.innerBorderColor }]}
      />
      <View
        style={[
          styles.statusPillIconBadge,
          {
            width: iconBubbleSize,
            height: iconBubbleSize,
            borderRadius: iconBubbleSize / 2,
            backgroundColor: tone.iconBackgroundColor,
          },
        ]}
      >
        <Ionicons name={icon} size={iconGlyphSize} color={tone.iconColor} />
      </View>
      <Text style={[styles.statusPillText, { color: tone.textColor, fontSize }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  return (
    <View style={shellStyle}>
      <BlurView tint="dark" intensity={24} style={frameStyle}>
        {content}
      </BlurView>
    </View>
  );
}

function CountdownDigit({
  value,
  digitWidth,
  digitHeight,
  fontSize,
  digitRadius,
  reducedMotion,
}: {
  value: string;
  digitWidth: number;
  digitHeight: number;
  fontSize: number;
  digitRadius: number;
  reducedMotion: boolean;
}) {
  const previousValueRef = useRef(value);
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (value === previousValueRef.current) return undefined;

    const exitingValue = previousValueRef.current;
    previousValueRef.current = value;

    if (reducedMotion) {
      setPreviousValue(null);
      progress.setValue(1);
      return undefined;
    }

    setPreviousValue(exitingValue);
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) setPreviousValue(null);
    });

    return () => {
      animation.stop();
    };
  }, [progress, reducedMotion, value]);

  const incomingStyle = previousValue
    ? {
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [-digitHeight, 0],
            }),
          },
        ],
      }
    : null;
  const outgoingStyle = {
    opacity: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, digitHeight],
        }),
      },
    ],
  };

  return (
    <View
      style={[
        styles.countdownDigitShadow,
        {
          width: digitWidth,
          height: digitHeight,
          borderRadius: digitRadius,
        },
      ]}
    >
      <View
        style={[
          styles.countdownDigit,
          {
            borderRadius: digitRadius,
          },
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(44,50,62,0.98)', 'rgba(13,16,23,0.98)', 'rgba(4,5,8,0.99)']}
          locations={[0, 0.52, 1]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.countdownDigitLeftBevel}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.48)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.countdownDigitRightBevel}
        />
        <View
          pointerEvents="none"
          style={[styles.countdownDigitInnerStroke, { borderRadius: digitRadius }]}
        />
        <View pointerEvents="none" style={styles.countdownDigitTopLip} />
        <View pointerEvents="none" style={styles.countdownDigitBottomLip} />
        <View pointerEvents="none" style={styles.countdownDigitMidline} />
        {previousValue ? (
          <Animated.Text
            style={[
              styles.countdownDigitText,
              {
                fontSize,
                lineHeight: digitHeight,
              },
              outgoingStyle,
            ]}
          >
            {previousValue}
          </Animated.Text>
        ) : null}
        <Animated.Text
          style={[
            styles.countdownDigitText,
            {
              fontSize,
              lineHeight: digitHeight,
            },
            incomingStyle,
          ]}
        >
          {value}
        </Animated.Text>
      </View>
    </View>
  );
}

function RequestCountdownTimer({
  remainingSeconds,
  scale,
  height,
  style,
}: {
  remainingSeconds: number;
  scale: number;
  height: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReduceMotion();
  const px = (value: number) => Math.round(value * scale);
  const parts = countdownTimeParts(remainingSeconds);
  const digitHeight = Math.max(px(52), height - px(16));
  const digitWidth = Math.round(digitHeight * 0.66);
  const fontSize = Math.round(digitHeight * 0.6);
  const digitRadius = px(11);

  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={`${parts.hours} hours, ${parts.minutes} minutes, ${parts.seconds} seconds left to accept this request`}
      style={[
        styles.countdownShell,
        {
          height,
          paddingHorizontal: px(4),
          paddingVertical: px(8),
          gap: px(10),
        },
        style,
      ]}
    >
      {COUNTDOWN_SEGMENTS.map((segment, segmentIndex) => (
        <View key={segment} style={[styles.countdownSegment, { gap: px(3) }]}>
          {parts[segment].split('').map((digit, digitIndex) => (
            <CountdownDigit
              key={`${segment}-${digitIndex}`}
              value={digit}
              digitWidth={digitWidth}
              digitHeight={digitHeight}
              fontSize={fontSize}
              digitRadius={digitRadius}
              reducedMotion={reducedMotion}
            />
          ))}
          {segmentIndex < COUNTDOWN_SEGMENTS.length - 1 ? (
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={[
                styles.countdownColon,
                {
                  fontSize: Math.round(digitHeight * 0.58),
                  lineHeight: digitHeight,
                },
              ]}
            >
              :
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function CampaignStatusMeshBackground({
  tone,
  borderRadius,
}: {
  tone: CampaignCardGradientTone;
  borderRadius: number;
}) {
  return (
    <View pointerEvents="none" style={[styles.meshBackground, { backgroundColor: tone.baseColor }]}>
      <MeshGradientView
        style={StyleSheet.absoluteFillObject}
        columns={3}
        rows={3}
        points={CAMPAIGN_CARD_MESH_POINTS.map(([x, y]) => [x, y])}
        colors={[...tone.meshColors]}
        smoothsColors
      />
      <LinearGradient
        colors={[...tone.topSheen]}
        locations={[0, 0.36, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.meshTopSheen}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)', tone.edgeShadowColor]}
        locations={[0, 0.64, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.meshReliefWash}
      />
      <View style={[styles.meshBevel, { borderRadius }]} />
      <View style={styles.meshTopCurveLight} />
      <View style={styles.meshBottomLeftCurveLight} />
      <View style={styles.meshBottomRightCurveLight} />
    </View>
  );
}

function RequestedHeroSignalChip({
  avatarUrl,
  fallbackInitial,
  icon,
  eyebrow,
  label,
  compact,
  style,
}: {
  avatarUrl?: string;
  fallbackInitial?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  eyebrow: string;
  label: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.heroSignalChip, compact ? styles.heroSignalChipCompact : null, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.34)', 'rgba(255,255,255,0.08)', 'rgba(37,20,17,0.18)']}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroSignalInnerStroke} />
      {avatarUrl || fallbackInitial ? (
        <View style={styles.heroSignalAvatar}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.heroSignalAvatarImage}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.heroSignalAvatarInitial}>{fallbackInitial}</Text>
          )}
        </View>
      ) : icon ? (
        <View style={styles.heroSignalIconBadge}>
          <Ionicons name={icon} size={12} color="#7B4815" />
        </View>
      ) : null}
      <View style={styles.heroSignalTextBlock}>
        <Text style={styles.heroSignalEyebrow} numberOfLines={1}>
          {eyebrow}
        </Text>
        <Text style={styles.heroSignalLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
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
}: Props) {
  const scale = Math.min(cardWidth / 360, cardHeight / 560);
  const px = (value: number) => Math.round(value * scale);
  const [now, setNow] = useState(() => Date.now());
  const brandName = campaign.business_profile?.brand_name?.trim() || 'Plugoh brand';
  const displayIdentity = role === 'business' ? creatorName(campaign) : brandName;
  const ownerImageUrl =
    role === 'business' ? influencerProfileImageUrl(campaign) : businessProfileImageUrl(campaign);
  const brandImageUrl = businessProfileImageUrl(campaign);
  const title = campaign.ai_title?.trim() || campaign.title.trim() || brandName;
  const detailLine =
    role === 'business' ? brandBookedLine(campaign) : influencerBookedLine(campaign);
  const packageLabel = formatPackageType(campaign.package_type) || 'Collab brief';
  const expiryLabel = useMemo(
    () => formatExpiryLabel(campaign.expires_at, now),
    [campaign.expires_at, now],
  );
  const isExpired = expiryLabel === 'Expired';
  const hasActiveTimer = Boolean(expiryLabel && !isExpired);
  const isAwaitingAcceptance = ACTIONABLE_STATUSES.has(campaign.status);
  const showAcceptanceTimer = role === 'influencer' && isAwaitingAcceptance && hasActiveTimer;
  const remainingAcceptanceSeconds = showAcceptanceTimer
    ? remainingSecondsUntil(campaign.expires_at, now)
    : null;
  const badgeLabel =
    isAwaitingAcceptance && hasActiveTimer ? 'Requested' : formatStatus(campaign.status);
  const badgeIcon =
    isAwaitingAcceptance && hasActiveTimer ? statusIcon('requested') : statusIcon(campaign.status);
  const badgeTone = statusPillTone(campaign.status, hasActiveTimer);
  const hasDockedTimer = remainingAcceptanceSeconds != null;
  const timerRowHeight = px(72);
  const bottomContentPadding = hasDockedTimer ? timerRowHeight + px(48) : px(36);
  const gradientFamily = campaignCardGradientFamily(campaign.status, role);
  const gradientTone = CAMPAIGN_CARD_GRADIENT_TONES[gradientFamily];
  const heroFamily = campaignCardHeroFamily(campaign.status);
  const heroImage =
    heroFamily === 'requested'
      ? requestedCardHeroImage
      : heroFamily === 'delivery'
        ? deliveryCardHeroImage
        : heroFamily === 'completed'
          ? completedCardHeroImage
          : null;
  const showRequestedSignals = heroFamily === 'requested';
  const heroHeight = hasDockedTimer ? Math.round(cardHeight * 0.43) : Math.round(cardHeight * 0.58);
  const heroWidth = Math.min(Math.round(cardWidth * 0.86), Math.round(heroHeight * 0.94));
  const heroTop = hasDockedTimer ? px(70) : px(78);

  useEffect(() => {
    if (!campaign.expires_at) return undefined;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, SECOND_MS);
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
            backgroundColor: gradientTone.baseColor,
          },
        ]}
      >
        <CampaignStatusMeshBackground
          tone={gradientTone}
          borderRadius={CAMPAIGN_CARD_CORNER_RADIUS}
        />

        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(0,0,0,0)',
            'rgba(18,8,5,0)',
            'rgba(20,8,5,0.1)',
            'rgba(20,8,5,0.34)',
            'rgba(20,8,5,0.72)',
          ]}
          locations={[0, 0.48, 0.66, 0.84, 1]}
          style={styles.backgroundGradient}
        />
        {heroImage ? (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.heroImageSlot,
              {
                top: heroTop,
                height: heroHeight,
              },
            ]}
          >
            {showRequestedSignals ? (
              <>
                <RequestedHeroSignalChip
                  avatarUrl={brandImageUrl}
                  fallbackInitial={initial(brandName)}
                  eyebrow="Invite from"
                  label={brandName}
                  style={[
                    styles.heroSignalPrimary,
                    {
                      right: px(22),
                      top: px(40),
                      maxWidth: Math.round(cardWidth * 0.44),
                    },
                  ]}
                />
                <RequestedHeroSignalChip
                  icon="megaphone"
                  eyebrow="Campaign"
                  label={packageLabel}
                  compact
                  style={[
                    styles.heroSignalSecondary,
                    {
                      left: px(34),
                      bottom: px(48),
                      maxWidth: Math.round(cardWidth * 0.38),
                    },
                  ]}
                />
              </>
            ) : null}
            <Image
              source={heroImage}
              style={[
                styles.heroImage,
                {
                  width: heroWidth,
                  height: heroHeight,
                },
              ]}
              contentFit="contain"
            />
          </View>
        ) : null}
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
            tone={badgeTone}
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

        {remainingAcceptanceSeconds != null ? (
          <View
            style={[
              styles.timerRow,
              {
                height: timerRowHeight,
                left: px(18),
                right: px(18),
                bottom: px(23),
              },
            ]}
          >
            <RequestCountdownTimer
              remainingSeconds={remainingAcceptanceSeconds}
              scale={scale}
              height={timerRowHeight}
              style={styles.timerFill}
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
    backgroundColor: 'transparent',
  },
  shell: {
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: '#3A1D18',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.1)',
  },
  meshBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  meshTopSheen: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.26,
  },
  meshReliefWash: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.24,
  },
  meshBevel: {
    ...StyleSheet.absoluteFillObject,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderTopColor: 'rgba(255,255,255,0.32)',
    borderLeftColor: 'rgba(255,255,255,0.18)',
    borderRightColor: 'rgba(0,0,0,0.18)',
    borderBottomColor: 'rgba(0,0,0,0.28)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.22), inset 0 -3px 5px rgba(96,50,12,0.32)',
  },
  meshTopCurveLight: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 0,
    height: 34,
    borderTopWidth: 2,
    borderTopLeftRadius: CAMPAIGN_CARD_CORNER_RADIUS,
    borderTopRightRadius: CAMPAIGN_CARD_CORNER_RADIUS,
    borderTopColor: 'rgba(255,255,255,0.52)',
    opacity: 0.86,
  },
  meshBottomLeftCurveLight: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 76,
    height: 76,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderBottomLeftRadius: CAMPAIGN_CARD_CORNER_RADIUS,
    borderLeftColor: 'rgba(255,238,200,0.32)',
    borderBottomColor: 'rgba(255,220,166,0.3)',
    opacity: 0.86,
  },
  meshBottomRightCurveLight: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 76,
    height: 76,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderBottomRightRadius: CAMPAIGN_CARD_CORNER_RADIUS,
    borderRightColor: 'rgba(255,205,174,0.28)',
    borderBottomColor: 'rgba(255,220,166,0.26)',
    opacity: 0.84,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImageSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    zIndex: 2,
    opacity: 0.98,
  },
  heroSignalChip: {
    position: 'absolute',
    zIndex: 3,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(102, 58, 42, 0.22)',
    paddingHorizontal: 9,
    paddingVertical: 6,
    shadowColor: '#6B2F24',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 9,
    elevation: 0,
  },
  heroSignalChipCompact: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  heroSignalPrimary: {
    transform: [{ rotate: '-3deg' }],
  },
  heroSignalSecondary: {
    transform: [{ rotate: '3deg' }],
  },
  heroSignalInnerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroSignalAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.58)',
    backgroundColor: 'rgba(255,255,255,0.72)',
    flexShrink: 0,
  },
  heroSignalAvatarImage: {
    width: '100%',
    height: '100%',
  },
  heroSignalAvatarInitial: {
    ...theme.typography.label,
    color: '#432019',
    fontSize: 11,
    fontWeight: '900',
  },
  heroSignalIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,217,91,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
    flexShrink: 0,
  },
  heroSignalTextBlock: {
    flexShrink: 1,
    minWidth: 0,
  },
  heroSignalEyebrow: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroSignalLabel: {
    ...theme.typography.label,
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 0,
  },
  statusPillFrame: {
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderWidth: 1,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.08)',
  },
  statusPillMatteWash: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.64,
  },
  statusPillInnerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
  },
  statusPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  statusPillIconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
  },
  statusPillText: {
    ...theme.typography.label,
    color: '#FFFFFF',
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.42)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  detailLine: {
    color: 'rgba(255,255,255,0.68)',
    fontWeight: '400',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.36)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  countdownShell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownSegment: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownDigitShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 8,
    elevation: 8,
  },
  countdownDigit: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderTopColor: 'rgba(255,255,255,0.32)',
    borderLeftColor: 'rgba(255,255,255,0.22)',
    borderRightColor: 'rgba(0,0,0,0.46)',
    borderBottomColor: 'rgba(0,0,0,0.58)',
    backgroundColor: 'rgba(4, 5, 9, 0.99)',
  },
  countdownDigitLeftBevel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '38%',
  },
  countdownDigitRightBevel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '42%',
  },
  countdownDigitInnerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  countdownDigitTopLip: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  countdownDigitBottomLip: {
    position: 'absolute',
    left: 2,
    right: 2,
    bottom: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  countdownDigitMidline: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  countdownDigitText: {
    ...theme.typography.mono,
    position: 'absolute',
    inset: 0,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 7,
  },
  countdownColon: {
    ...theme.typography.mono,
    color: 'rgba(255,255,255,0.88)',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.18)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  description: {
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '500',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.38)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 9,
  },
  timerRow: {
    position: 'absolute',
    zIndex: 4,
  },
  timerFill: {
    flex: 1,
    width: '100%',
  },
});
