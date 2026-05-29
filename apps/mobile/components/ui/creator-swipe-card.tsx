import { CAMPAIGN_CARD_CORNER_RADIUS } from '@/constants/campaign-card-frame';
import { theme } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Influencer } from '@plugoh/contracts';
import { BlurView } from 'expo-blur';
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

function formatNumber(value?: number) {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  return Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

function formatCurrency(amount?: number | null) {
  if (amount == null || !Number.isFinite(amount)) return 'Not set';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function SignalPill({
  label,
  value,
  icon,
  scale,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  scale: number;
}) {
  const px = (amount: number) => Math.round(amount * scale);
  return (
    <View style={[styles.signalPill, { borderRadius: px(18), paddingVertical: px(9) }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(5) }}>
        <Ionicons name={icon} size={px(13)} color="rgba(255,255,255,0.7)" />
        <Text style={[styles.signalLabel, { fontSize: px(11), lineHeight: px(14) }]}>{label}</Text>
      </View>
      <Text
        style={[styles.signalValue, { fontSize: px(15), lineHeight: px(19) }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
      >
        {value}
      </Text>
    </View>
  );
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

        <View style={[styles.topRow, { padding: px(20) }]} pointerEvents="none">
          <BlurView
            tint="systemUltraThinMaterialDark"
            intensity={72}
            style={[
              styles.categoryPill,
              {
                minHeight: px(34),
                borderRadius: px(17),
              },
            ]}
          >
            <View
              style={[
                styles.categoryPillInner,
                {
                  minHeight: px(34),
                  paddingHorizontal: px(11),
                  gap: px(6),
                },
              ]}
            >
              <Ionicons name="sparkles" size={px(14)} color="rgba(255,255,255,0.94)" />
              <Text style={[styles.categoryText, { fontSize: px(12) }]} numberOfLines={1}>
                {category}
              </Text>
            </View>
          </BlurView>
        </View>

        <View
          pointerEvents="none"
          style={[
            styles.content,
            {
              paddingHorizontal: px(24),
              paddingBottom: px(24),
              gap: px(13),
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
            <View style={{ alignItems: 'center', gap: px(4) }}>
              <Text
                selectable
                style={[
                  styles.name,
                  {
                    fontSize: px(name.length > 24 ? 29 : 34),
                    lineHeight: px(name.length > 24 ? 34 : 40),
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

          <View style={[styles.signalRow, { gap: px(8) }]}>
            <SignalPill
              label="Followers"
              value={formatNumber(creator.follower_count)}
              icon="people"
              scale={scale}
            />
            <SignalPill
              label="Avg likes"
              value={formatNumber(creator.avg_likes_per_reel)}
              icon="heart"
              scale={scale}
            />
            <SignalPill
              label="From"
              value={formatCurrency(startingPrice)}
              icon="pricetag"
              scale={scale}
            />
          </View>
        </View>
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
  cardHitArea: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
  },
  cardPressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
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
  categoryPill: {
    maxWidth: '72%',
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  categoryPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    color: 'rgba(255,255,255,0.94)',
    fontWeight: '700',
    letterSpacing: 0,
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
    letterSpacing: 0,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.42)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  handle: {
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '700',
    letterSpacing: 0,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.36)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  positioning: {
    color: 'rgba(255,255,255,0.66)',
    fontWeight: '500',
    letterSpacing: 0,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.36)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  signalRow: {
    flexDirection: 'row',
  },
  signalPill: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  signalLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    letterSpacing: 0,
  },
  signalValue: {
    color: '#FFFFFF',
    fontFamily: theme.typography.mono.fontFamily,
    fontWeight: '700',
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
});
