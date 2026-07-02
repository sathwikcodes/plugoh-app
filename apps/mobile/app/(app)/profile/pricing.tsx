import { BackHeader } from '@/components/ui/app-header';
import { PrimaryButton } from '@/components/ui/primitives';
import { SnapBadgeCarousel } from '@/components/ui/snap-badge-carousel';
import { theme } from '@/constants/theme';
import { useInfluencerProfile, useMarketplaceMutations } from '@/hooks/use-marketplace';
import coinImage from '@/assets/images/coin.png';
import postPriceImage from '@/assets/images/post_price.png';
import reelPriceImage from '@/assets/images/reel_price.png';
import storyPriceImage from '@/assets/images/story_price.png';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

const PRICE_CARD_HEIGHT = 220;
const STEP = 500;
const FIELD_BORDER = 'rgba(255,255,255,0.18)';

const schema = z.object({
  price_per_reel: z.number().min(0),
  price_per_post: z.number().min(0),
  price_per_story: z.number().min(0),
});

type FormValues = z.infer<typeof schema>;
type PricingField = keyof FormValues;

type PricePackageItem = {
  field: PricingField;
  title: string;
  image: ImageSourcePropType;
  tone: string;
};

const packages: PricePackageItem[] = [
  { field: 'price_per_story', title: 'Story', image: storyPriceImage, tone: '#2FA46F' },
  { field: 'price_per_reel', title: 'Reel', image: reelPriceImage, tone: '#E76A92' },
  { field: 'price_per_post', title: 'Post', image: postPriceImage, tone: '#5C84D6' },
];

// ─── Price badge carousel ─────────────────────────────────────────────────────

type PriceBadgeCarouselProps = {
  items: PricePackageItem[];
  values: FormValues;
  onChange: (field: PricingField, value: number) => void;
};

function PriceBadgeCarousel({ items, values, onChange }: PriceBadgeCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = items[activeIndex] ?? items[0];
  const activeValue = values[activeItem.field];
  const textValue = activeValue > 0 ? String(activeValue) : '';

  return (
    <View style={styles.carouselShell}>
      <SnapBadgeCarousel
        items={items}
        keyExtractor={(item) => item.field}
        cardHeight={PRICE_CARD_HEIGHT}
        onActiveIndexChange={(index) => {
          setActiveIndex(index);
        }}
        renderItem={({ item, cardWidth }) => (
          <Image
            source={item.image}
            style={{ width: cardWidth, height: PRICE_CARD_HEIGHT }}
            contentFit="contain"
            accessibilityIgnoresInvertColors
            accessibilityLabel={item.title}
          />
        )}
      />

      {/* Floating price editor strip */}
      <View style={styles.priceStrip}>
        <Text style={styles.priceLabel}>{activeItem.title.toUpperCase()}</Text>
        <View style={styles.priceEditorRow}>
          <Pressable
            accessibilityLabel={`Decrease ${activeItem.title} price`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              onChange(activeItem.field, Math.max(0, activeValue - STEP));
            }}
            style={({ pressed }) => [styles.stepperButton, pressed && styles.stepperPressed]}
          >
            <Ionicons name="remove" size={18} color="#FFFFFF" />
          </Pressable>
          {isLiquidGlassAvailable() ? (
            <GlassView glassEffectStyle="regular" colorScheme="dark" style={styles.priceField}>
              <View style={styles.priceFieldInner}>
                <Image
                  source={coinImage}
                  style={styles.coinIcon}
                  contentFit="contain"
                  accessibilityIgnoresInvertColors
                />
                <TextInput
                  style={styles.priceInputNative}
                  value={textValue}
                  onChangeText={(next) => {
                    const digits = next.replace(/\D/g, '');
                    onChange(activeItem.field, digits ? Number(digits) : 0);
                  }}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.48)"
                  selectionColor="#FFFFFF"
                  cursorColor="#FFFFFF"
                  accessibilityLabel={`${activeItem.title} price`}
                />
              </View>
            </GlassView>
          ) : (
            <BlurView tint="systemUltraThinMaterialDark" intensity={88} style={styles.priceField}>
              <View style={styles.priceFieldInner}>
                <Image
                  source={coinImage}
                  style={styles.coinIcon}
                  contentFit="contain"
                  accessibilityIgnoresInvertColors
                />
                <TextInput
                  style={styles.priceInputNative}
                  value={textValue}
                  onChangeText={(next) => {
                    const digits = next.replace(/\D/g, '');
                    onChange(activeItem.field, digits ? Number(digits) : 0);
                  }}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.48)"
                  selectionColor="#FFFFFF"
                  cursorColor="#FFFFFF"
                  accessibilityLabel={`${activeItem.title} price`}
                />
              </View>
            </BlurView>
          )}
          <Pressable
            accessibilityLabel={`Increase ${activeItem.title} price`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              onChange(activeItem.field, activeValue + STEP);
            }}
            style={({ pressed }) => [styles.stepperButton, pressed && styles.stepperPressed]}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PricingScreen() {
  const insets = useSafeAreaInsets();
  const profile = useInfluencerProfile();
  const mutations = useMarketplaceMutations();
  const { handleSubmit, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { price_per_reel: 0, price_per_post: 0, price_per_story: 0 },
  });

  useEffect(() => {
    if (!profile.data) return;
    setValue('price_per_reel', (profile.data.price_per_reel_paise ?? 0) / 100);
    setValue('price_per_post', (profile.data.price_per_post_paise ?? 0) / 100);
    setValue('price_per_story', (profile.data.price_per_story_paise ?? 0) / 100);
  }, [profile.data, setValue]);

  const setPrice = (field: PricingField, value: number) => {
    setValue(field, Math.max(0, value), { shouldValidate: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutations.updatePricing.mutateAsync({
        price_per_reel_paise: values.price_per_reel * 100,
        price_per_post_paise: values.price_per_post * 100,
        price_per_story_paise: values.price_per_story * 100,
      });
      router.back();
    } catch (error) {
      Alert.alert(
        'Could not update rate card',
        error instanceof Error ? error.message : 'Try again.',
      );
    }
  });

  const scrollBottomPad =
    theme.spacing.hero + theme.spacing.jumbo + theme.spacing.xxl + insets.bottom;

  const values: FormValues = {
    price_per_reel: watch('price_per_reel'),
    price_per_post: watch('price_per_post'),
    price_per_story: watch('price_per_story'),
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackHeader
          title="Pricing"
          onBack={() => {
            router.back();
          }}
          style={styles.pageHeaderRow}
        />

        <PriceBadgeCarousel items={packages} values={values} onChange={setPrice} />
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, theme.spacing.md) + theme.spacing.md },
        ]}
      >
        <PrimaryButton
          label={mutations.updatePricing.isPending ? 'Saving...' : 'Save'}
          disabled={mutations.updatePricing.isPending}
          onPress={onSubmit}
          style={styles.saveButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.backgroundClear,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.section,
  },
  pageHeaderRow: {
    marginBottom: theme.spacing.xs,
  },

  // ── Carousel ──
  carouselShell: {
    marginHorizontal: -theme.spacing.xxl,
  },

  // ── Floating price editor strip ──
  priceStrip: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  priceLabel: {
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: theme.colors.foreground,
    textAlign: 'center',
    includeFontPadding: false,
  },
  priceEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    width: '100%',
  },
  stepperButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  stepperPressed: {
    opacity: 0.76,
  },
  priceField: {
    flex: 1,
    height: 60,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    backgroundColor: 'rgba(255,255,255,0.055)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceFieldInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinIcon: {
    width: 22,
    height: 22,
    flexShrink: 0,
  },
  priceInputNative: {
    color: '#FFFFFF',
    fontFamily: theme.typography.body.fontFamily,
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.body.fontWeight,
    padding: 0,
    margin: 0,
    minWidth: 36,
    maxWidth: 130,
    includeFontPadding: false,
  },

  // ── Footer ──
  footer: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  saveButton: {
    alignSelf: 'stretch',
  },
});
