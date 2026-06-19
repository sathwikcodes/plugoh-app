import ghostImage from '@/assets/images/ghost.png';
import { CAMPAIGN_CARD_CORNER_RADIUS } from '@/constants/campaign-card-frame';
import { theme } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function CampaignDeckEmptyState({
  title = 'No campaigns',
  subtitle = 'Brand requests will appear here.',
  imageSource = ghostImage,
  cardWidth,
  cardHeight,
}: {
  title?: string;
  subtitle?: string;
  imageSource?: ImageSourcePropType;
  cardWidth: number;
  cardHeight: number;
}) {
  const imageSize = Math.min(Math.round(cardWidth * 0.34), 118);
  const cardStyle = [
    styles.deckCard,
    {
      width: cardWidth,
      height: cardHeight,
      borderRadius: CAMPAIGN_CARD_CORNER_RADIUS,
    },
  ];
  const content = (
    <>
      <View style={styles.deckCardWash} />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.045)', 'rgba(255,255,255,0)']}
        locations={[0, 0.5, 1]}
        style={styles.deckCardHighlight}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.055)']}
        locations={[0, 1]}
        style={styles.deckCardBottomGlow}
      />
      <View style={styles.deckCardContent}>
        <Image
          source={imageSource}
          style={[styles.deckImage, { width: imageSize, height: imageSize }]}
          contentFit="contain"
          accessibilityLabel="Campaign target illustration"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.deckCopy}>
          <Text style={styles.deckCardTitle}>{title}</Text>
          <Text style={styles.deckCardSubtitle}>{subtitle}</Text>
        </View>
      </View>
    </>
  );

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="dark" style={cardStyle}>
        {content}
      </GlassView>
    );
  }

  return (
    <BlurView tint="systemUltraThinMaterialDark" intensity={82} style={cardStyle}>
      {content}
    </BlurView>
  );
}

export function CampaignEmptyState({
  title = "You're all caught up!",
  subtitle = 'No new campaign requests right now.\nPull down to check for updates.',
}: {
  title?: string;
  subtitle?: string;
}) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 300 });
    textOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
  }, [opacity, scale, textOpacity]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xl,
        paddingHorizontal: theme.spacing.section,
      }}
    >
      <Animated.View style={circleStyle}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.colors.successSoft,
            borderWidth: 2,
            borderColor: theme.colors.success,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Checkmark drawn with views */}
          <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                position: 'absolute',
                width: 2,
                height: 14,
                backgroundColor: theme.colors.success,
                borderRadius: 1,
                bottom: 6,
                left: 8,
                transform: [{ rotate: '45deg' }, { translateY: -2 }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: 2,
                height: 22,
                backgroundColor: theme.colors.success,
                borderRadius: 1,
                bottom: 6,
                right: 8,
                transform: [{ rotate: '-45deg' }, { translateY: -5 }],
              }}
            />
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[textStyle, { alignItems: 'center', gap: theme.spacing.sm }]}>
        <Text
          style={{
            ...theme.typography.section,
            color: theme.colors.foreground,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            ...theme.typography.body,
            color: theme.colors.muted,
            textAlign: 'center',
          }}
        >
          {subtitle}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  deckCard: {
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 16,
  },
  deckCardWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.052)',
  },
  deckCardHighlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    height: '70%',
    borderTopLeftRadius: CAMPAIGN_CARD_CORNER_RADIUS - 1,
    borderTopRightRadius: CAMPAIGN_CARD_CORNER_RADIUS - 1,
  },
  deckCardBottomGlow: {
    position: 'absolute',
    left: 1,
    right: 1,
    bottom: 1,
    height: '42%',
    borderBottomLeftRadius: CAMPAIGN_CARD_CORNER_RADIUS - 1,
    borderBottomRightRadius: CAMPAIGN_CARD_CORNER_RADIUS - 1,
  },
  deckCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.section,
  },
  deckImage: {
    opacity: 0.96,
  },
  deckCopy: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  deckCardTitle: {
    ...theme.typography.section,
    color: theme.colors.foreground,
    textAlign: 'center',
  },
  deckCardSubtitle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.58)',
    textAlign: 'center',
    maxWidth: 260,
  },
});
