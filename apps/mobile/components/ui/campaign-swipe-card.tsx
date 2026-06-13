import { CAMPAIGN_CARD_CORNER_RADIUS } from '@/constants/campaign-card-frame';
import { theme } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { CampaignListItem } from '@plugoh/contracts';
import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  ImageBackground,
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

type StatusPillTone = {
  tintColor: string;
  overlayColor: string;
  borderColor: string;
  innerBorderColor: string;
  highlightColor: string;
  lowlightColor: string;
  textColor: string;
  shadowColor: string;
  shadowOpacity: number;
};

const STATUS_PILL_TONES = {
  success: {
    tintColor: 'rgba(40, 174, 108, 0.34)',
    overlayColor: 'rgba(29, 190, 113, 0.2)',
    borderColor: 'rgba(130, 255, 191, 0.42)',
    innerBorderColor: 'rgba(210, 255, 231, 0.24)',
    highlightColor: 'rgba(223, 255, 237, 0.32)',
    lowlightColor: 'rgba(8, 67, 39, 0.28)',
    textColor: '#D9FFE7',
    shadowColor: '#19C76F',
    shadowOpacity: 0.32,
  },
  warning: {
    tintColor: 'rgba(245, 185, 49, 0.34)',
    overlayColor: 'rgba(255, 193, 54, 0.22)',
    borderColor: 'rgba(255, 225, 129, 0.48)',
    innerBorderColor: 'rgba(255, 247, 204, 0.26)',
    highlightColor: 'rgba(255, 246, 211, 0.34)',
    lowlightColor: 'rgba(118, 76, 6, 0.3)',
    textColor: '#FFF3C0',
    shadowColor: '#F4B321',
    shadowOpacity: 0.34,
  },
  danger: {
    tintColor: 'rgba(230, 68, 73, 0.34)',
    overlayColor: 'rgba(238, 66, 72, 0.22)',
    borderColor: 'rgba(255, 148, 148, 0.46)',
    innerBorderColor: 'rgba(255, 222, 222, 0.24)',
    highlightColor: 'rgba(255, 225, 225, 0.3)',
    lowlightColor: 'rgba(99, 13, 19, 0.3)',
    textColor: '#FFD7D7',
    shadowColor: '#EA3F45',
    shadowOpacity: 0.34,
  },
  neutral: {
    tintColor: 'rgba(72, 92, 135, 0.24)',
    overlayColor: 'rgba(255, 255, 255, 0.055)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    innerBorderColor: 'rgba(255, 255, 255, 0.18)',
    highlightColor: 'rgba(255, 255, 255, 0.26)',
    lowlightColor: 'rgba(0, 0, 0, 0.24)',
    textColor: 'rgba(255,255,255,0.94)',
    shadowColor: '#000000',
    shadowOpacity: 0.26,
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
  const shellStyle = [
    styles.statusPillShell,
    {
      minHeight,
      borderRadius: theme.radius.pill,
      shadowColor: tone.shadowColor,
      shadowOpacity: tone.shadowOpacity,
    },
  ];
  const frameStyle = [
    styles.statusPillFrame,
    {
      minHeight,
      borderRadius: theme.radius.pill,
      borderColor: tone.borderColor,
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
      <View
        pointerEvents="none"
        style={[styles.statusPillTint, { backgroundColor: tone.overlayColor }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[tone.highlightColor, 'rgba(255,255,255,0.02)', tone.lowlightColor]}
        locations={[0, 0.48, 1]}
        style={styles.statusPillSheen}
      />
      <View
        pointerEvents="none"
        style={[styles.statusPillInnerStroke, { borderColor: tone.innerBorderColor }]}
      />
      <Ionicons name={icon} size={iconSize} color={tone.textColor} />
      <Text style={[styles.statusPillText, { color: tone.textColor, fontSize }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  if (isLiquidGlassAvailable()) {
    return (
      <View style={shellStyle}>
        <GlassView
          glassEffectStyle="regular"
          colorScheme="dark"
          tintColor={tone.tintColor}
          style={frameStyle}
        >
          {content}
        </GlassView>
      </View>
    );
  }

  return (
    <View style={shellStyle}>
      <BlurView tint="dark" intensity={58} style={frameStyle}>
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
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 8,
  },
  statusPillFrame: {
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderWidth: 1,
    backgroundColor: 'rgba(8,9,14,0.2)',
  },
  statusPillTint: {
    ...StyleSheet.absoluteFillObject,
  },
  statusPillSheen: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.82,
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
  statusPillText: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.94)',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
