import { SnapBadgeCarousel } from '@/components/ui/snap-badge-carousel';
import { theme } from '@/constants/theme';
import coinImage from '@/assets/images/coin.png';
import postPriceImage from '@/assets/images/post_price.png';
import reelPriceImage from '@/assets/images/reel_price.png';
import storyPriceImage from '@/assets/images/story_price.png';
import { PACKAGE_TYPES, type Influencer } from '@plugoh/contracts';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type ImageSourcePropType, type ViewStyle } from 'react-native';

const CARD_HEIGHT = 220;

type PackageType = (typeof PACKAGE_TYPES)[number];

type BookingPackageItem = {
  packageType: PackageType;
  title: string;
  image: ImageSourcePropType;
  pricePaise: number;
};

const PACKAGE_DEFS: { packageType: PackageType; title: string; image: ImageSourcePropType }[] = [
  { packageType: 'instagram_story', title: 'Story', image: storyPriceImage },
  { packageType: 'instagram_reel', title: 'Reel', image: reelPriceImage },
  { packageType: 'instagram_post', title: 'Post', image: postPriceImage },
];

function packagePricePaise(influencer: Influencer | null | undefined, packageType: PackageType) {
  if (packageType === 'instagram_reel') return influencer?.price_per_reel_paise ?? 0;
  if (packageType === 'instagram_post') return influencer?.price_per_post_paise ?? 0;
  return influencer?.price_per_story_paise ?? 0;
}

function formatPriceAmount(pricePaise: number) {
  return Math.round(pricePaise / 100).toLocaleString('en-IN');
}

type BookingPackageCarouselProps = {
  influencer?: Influencer | null;
  onChange?: (packageType: PackageType) => void;
  style?: ViewStyle;
  /** Negative horizontal margin used to bleed the carousel edge-to-edge; match the parent's horizontal padding. */
  bleed?: number;
};

export function BookingPackageCarousel({
  influencer,
  onChange,
  style,
  bleed = theme.spacing.xxl,
}: BookingPackageCarouselProps) {
  const items = useMemo<BookingPackageItem[]>(
    () =>
      PACKAGE_DEFS.map((def) => ({
        ...def,
        pricePaise: packagePricePaise(influencer, def.packageType),
      })).filter((item) => item.pricePaise > 0),
    [influencer],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length]);

  useEffect(() => {
    if (items[activeIndex]) onChange?.(items[activeIndex].packageType);
  }, [activeIndex, items, onChange]);

  if (items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>This creator hasn&apos;t priced any packages yet.</Text>
      </View>
    );
  }

  const activeItem = items[activeIndex] ?? items[0];

  return (
    <View style={style}>
      <SnapBadgeCarousel
        items={items}
        keyExtractor={(item) => item.packageType}
        cardHeight={CARD_HEIGHT}
        bleed={bleed}
        onActiveIndexChange={(index) => {
          setActiveIndex(index);
        }}
        renderItem={({ item, cardWidth }) => (
          <Image
            source={item.image}
            style={{ width: cardWidth, height: CARD_HEIGHT }}
            contentFit="contain"
            accessibilityIgnoresInvertColors
            accessibilityLabel={item.title}
          />
        )}
      />
      <View style={[styles.priceStrip, { paddingHorizontal: bleed }]}>
        <View style={styles.priceDivider} />
        <Text style={styles.packageLabel}>{activeItem.title.toUpperCase()}</Text>
        <View
          style={styles.priceRow}
          accessibilityLabel={`${activeItem.title} package price ${formatPriceAmount(activeItem.pricePaise)}`}
        >
          <Image
            source={coinImage}
            style={styles.priceCoin}
            contentFit="contain"
            accessible={false}
          />
          <Text style={styles.priceValue}>{formatPriceAmount(activeItem.pricePaise)}</Text>
        </View>
        <View style={styles.priceDivider} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  priceStrip: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 82,
    paddingVertical: theme.spacing.sm,
    gap: 2,
  },
  priceDivider: {
    width: '50%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: theme.spacing.xs,
  },
  packageLabel: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.54)',
    textAlign: 'center',
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  priceRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  priceCoin: {
    width: 24,
    height: 24,
  },
  priceValue: {
    fontFamily: theme.typography.metricSmall.fontFamily,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.94)',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  emptyState: {
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
});
