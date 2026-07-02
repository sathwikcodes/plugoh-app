import { CAMPAIGN_CARD_CORNER_RADIUS } from '@/constants/campaign-card-frame';
import { theme } from '@/constants/theme';
import coinImage from '@/assets/images/coin.png';
import type { Influencer } from '@plugoh/contracts';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

type Props = {
  creator: Influencer;
  cardWidth: number;
  cardHeight: number;
  style?: ViewStyle;
  onViewPress?: () => void;
};

function firstText(...candidates: (string | null | undefined)[]) {
  return candidates.find((candidate) => Boolean(candidate?.trim()))?.trim();
}

function creatorImageUrl(creator: Influencer) {
  return firstText(creator.profile_photo_url, creator.avatar_url);
}

function creatorName(creator: Influencer) {
  return (
    firstText(creator.display_name, creator.ig_username, creator.instagram_handle) ?? 'Creator'
  );
}

function creatorHandle(creator: Influencer) {
  const handle = firstText(creator.ig_username, creator.instagram_handle);
  return handle ? `@${handle.replace(/^@/, '')}` : 'Instagram pending';
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

function formatPriceAmount(amount?: number | null) {
  const displayAmount = amount != null && Number.isFinite(amount) && amount > 0 ? amount : 5000;
  return String(Math.round(displayAmount));
}

export function CreatorSwipeCard({ creator, cardWidth, cardHeight, style, onViewPress }: Props) {
  const scale = Math.min(cardWidth / 360, cardHeight / 560);
  const px = (amount: number) => Math.round(amount * scale);
  const name = creatorName(creator);
  const handle = creatorHandle(creator);
  const imageUrl = creatorImageUrl(creator);
  const category = firstText(creator.category) ?? 'Creator';
  const city = firstText(creator.city);
  const positioning = [category, city].filter(Boolean).join(' · ');
  const startingPrice = creator.starterPrice ?? creator.price_per_reel ?? creator.price_per_post;
  const priceLabel = formatPriceAmount(startingPrice);

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
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessible={false}
          />
        ) : (
          <LinearGradient
            colors={['#271321', '#111522', '#050509']}
            locations={[0, 0.52, 1]}
            style={StyleSheet.absoluteFill}
          />
        )}

        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(5,5,9,0.05)',
            'rgba(5,5,9,0.1)',
            'rgba(5,5,9,0.32)',
            'rgba(5,5,9,0.68)',
            'rgba(5,5,9,0.97)',
          ]}
          locations={[0, 0.28, 0.54, 0.74, 1]}
          style={StyleSheet.absoluteFill}
        />

        <Pressable
          onPress={onViewPress}
          accessibilityRole="button"
          accessibilityLabel={`View ${name}`}
          style={({ pressed }) => [styles.cardHitArea, pressed ? styles.cardPressed : null]}
        />

        <View
          pointerEvents="box-none"
          style={[
            styles.content,
            {
              paddingHorizontal: px(24),
              paddingBottom: px(24),
              gap: px(16),
            },
          ]}
        >
          <View style={{ alignItems: 'center', gap: px(9) }}>
            <View
              style={[
                styles.avatarFrame,
                {
                  width: px(74),
                  height: px(74),
                  borderRadius: px(37),
                },
              ]}
            >
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  accessible={false}
                />
              ) : (
                <Text style={[styles.avatarInitials, { fontSize: px(24), lineHeight: px(30) }]}>
                  {initials(name)}
                </Text>
              )}
            </View>
            <View style={{ alignItems: 'center', gap: px(5), maxWidth: '100%' }}>
              <Text
                selectable
                style={[
                  styles.name,
                  {
                    fontSize: px(name.length > 24 ? 22 : 26),
                    lineHeight: px(name.length > 24 ? 27 : 31),
                  },
                ]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.76}
              >
                {name}
              </Text>
              <Text
                style={[styles.handle, { fontSize: px(15), lineHeight: px(20) }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {handle}
              </Text>
              {positioning ? (
                <Text
                  style={[styles.positioning, { fontSize: px(13), lineHeight: px(18) }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                >
                  {positioning}
                </Text>
              ) : null}
            </View>
          </View>

          <Pressable
            onPress={onViewPress}
            accessibilityRole="button"
            accessibilityLabel={`View ${name}, starting at ${priceLabel}`}
            style={({ pressed }) => [
              styles.priceButton,
              {
                minHeight: px(58),
                borderRadius: px(29),
              },
              pressed ? styles.priceButtonPressed : null,
            ]}
          >
            {isLiquidGlassAvailable() ? (
              <GlassView
                isInteractive
                glassEffectStyle="regular"
                colorScheme="light"
                style={styles.priceGlassFill}
              >
                <PriceButtonContent priceLabel={priceLabel} iconSize={px(30)} textSize={px(24)} />
              </GlassView>
            ) : (
              <BlurView tint="systemMaterialLight" intensity={92} style={styles.priceGlassFill}>
                <PriceButtonContent priceLabel={priceLabel} iconSize={px(30)} textSize={px(24)} />
              </BlurView>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function PriceButtonContent({
  priceLabel,
  iconSize,
  textSize,
}: {
  priceLabel: string;
  iconSize: number;
  textSize: number;
}) {
  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(255,255,255,0.72)',
          'rgba(255,255,255,0.48)',
          'rgba(255,248,235,0.36)',
          'rgba(255,255,255,0.5)',
        ]}
        locations={[0, 0.38, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.72)', 'rgba(255,255,255,0.32)', 'rgba(255,255,255,0)']}
        locations={[0, 0.5, 1]}
        style={styles.priceTopGlint}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(132,92,255,0)', 'rgba(132,92,255,0.08)', 'rgba(255,199,114,0.12)']}
        locations={[0, 0.52, 1]}
        style={styles.priceBottomRefraction}
      />
      <View style={[styles.priceButtonContent, { height: iconSize }]}>
        <Image
          source={coinImage}
          style={{ width: iconSize, height: iconSize }}
          contentFit="contain"
          accessible={false}
        />
        <Text
          style={[
            styles.priceButtonText,
            {
              fontSize: textSize,
              lineHeight: iconSize,
              height: iconSize,
              transform: [{ translateY: 3 }],
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {priceLabel}
        </Text>
      </View>
    </>
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
  cardHitArea: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
  },
  cardPressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
  },
  avatarFrame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.78)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    color: '#111522',
    fontWeight: '900',
  },
  name: {
    color: '#FFFFFF',
    fontFamily: theme.typography.display.fontFamily,
    fontWeight: '400',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.42)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  handle: {
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: '100%',
    textShadowColor: 'rgba(0,0,0,0.36)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  positioning: {
    color: 'rgba(255,255,255,0.66)',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: '100%',
    textShadowColor: 'rgba(0,0,0,0.36)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  priceButton: {
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.86)',
    backgroundColor: 'rgba(255,255,255,0.42)',
    boxShadow:
      '0 14px 22px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.74), inset 0 -1px 3px rgba(255,255,255,0.32)',
  },
  priceButtonPressed: {
    opacity: 0.9,
  },
  priceGlassFill: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.36)',
  },
  priceTopGlint: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 5,
    height: 17,
    borderRadius: 999,
    opacity: 0.9,
  },
  priceBottomRefraction: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 0,
    height: 28,
    borderRadius: 999,
  },
  priceButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  priceButtonText: {
    color: '#0D1222',
    fontFamily: theme.typography.metricSmall.fontFamily,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
