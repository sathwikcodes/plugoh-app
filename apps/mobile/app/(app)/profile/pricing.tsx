import { GlassCard } from '@/components/ui/glass-card';
import { GlassCircleButton } from '@/components/ui/glass-circle-button';
import { PrimaryButton } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useInfluencerProfile, useMarketplaceMutations } from '@/hooks/use-marketplace';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

const FIELD_RADIUS = 28;
const FIELD_BORDER = 'rgba(255,255,255,0.18)';
const FIELD_WASH = 'rgba(255,255,255,0.055)';
const PRICE_CARD_RADIUS = 28;
const PRICE_INPUT_HEIGHT = 58;
const STEP = 500;

const schema = z.object({
  price_per_reel: z.number().min(0),
  price_per_post: z.number().min(0),
  price_per_story: z.number().min(0),
});

type FormValues = z.infer<typeof schema>;
type PricingField = keyof FormValues;

const packages: {
  field: PricingField;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
}[] = [
  { field: 'price_per_reel', title: 'Reel Package', icon: 'videocam-outline', tone: '#E76A92' },
  { field: 'price_per_post', title: 'Post Package', icon: 'image-outline', tone: '#5C84D6' },
  {
    field: 'price_per_story',
    title: 'Story Package',
    icon: 'play-circle-outline',
    tone: '#2FA46F',
  },
];

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

function PriceStepper({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.stepperButton, pressed && styles.stepperPressed]}
    >
      <Ionicons name={icon} size={18} color="#FFFFFF" />
    </Pressable>
  );
}

function PricePackageCard({
  title,
  icon,
  tone,
  value,
  onChange,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const textValue = value > 0 ? String(value) : '';

  return (
    <GlassCard style={styles.packageCard} contentStyle={styles.packageInner}>
      <View style={styles.packageTopRow}>
        <View style={[styles.packageIconBox, { backgroundColor: tone }]}>
          <Ionicons name={icon} size={21} color="#FFFFFF" />
        </View>
        <View style={styles.packageTitleWrap}>
          <Text style={styles.packageTitle}>{title}</Text>
          <Text style={styles.packageAmount}>{value > 0 ? formatINR(value) : 'Not set'}</Text>
        </View>
      </View>

      <View style={styles.priceEditorRow}>
        <PriceStepper
          icon="remove"
          label={`Decrease ${title}`}
          onPress={() => {
            onChange(Math.max(0, value - STEP));
          }}
        />
        <BlurView tint="systemUltraThinMaterialDark" intensity={86} style={styles.priceFieldShell}>
          <View pointerEvents="none" style={styles.fieldWash} />
          <Text style={styles.currencyPrefix}>₹</Text>
          <TextInput
            value={textValue}
            onChangeText={(next) => {
              const digits = next.replace(/\D/g, '');
              onChange(digits ? Number(digits) : 0);
            }}
            keyboardType="number-pad"
            textAlignVertical="center"
            underlineColorAndroid="transparent"
            placeholder="0"
            placeholderTextColor="rgba(255,255,255,0.38)"
            cursorColor="#FFFFFF"
            selectionColor="#FFFFFF"
            style={styles.priceInput}
          />
        </BlurView>
        <PriceStepper
          icon="add"
          label={`Increase ${title}`}
          onPress={() => {
            onChange(value + STEP);
          }}
        />
      </View>
    </GlassCard>
  );
}

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
    setValue('price_per_reel', profile.data.price_per_reel ?? 0);
    setValue('price_per_post', profile.data.price_per_post ?? 0);
    setValue('price_per_story', profile.data.price_per_story ?? 0);
  }, [profile.data, setValue]);

  const setPrice = (field: PricingField, value: number) => {
    setValue(field, Math.max(0, value), { shouldValidate: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutations.updatePricing.mutateAsync(values);
      router.back();
    } catch (error) {
      Alert.alert(
        'Could not update pricing',
        error instanceof Error ? error.message : 'Try again.',
      );
    }
  });

  const scrollBottomPad =
    theme.spacing.hero + theme.spacing.jumbo + theme.spacing.xxl + insets.bottom;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeaderRow}>
          <View style={styles.pageBackShadow}>
            <GlassCircleButton
              symbol="chevron.left"
              fallbackIcon="chevron-back"
              tintColor="#FFFFFF"
              size={44}
              symbolSize={19}
              accessibilityLabel="Go back"
              onPress={() => {
                router.back();
              }}
            />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.pageTitle}>Pricing</Text>
          </View>
        </View>

        <View style={styles.packageColumn}>
          {packages.map((item) => (
            <PricePackageCard
              key={item.field}
              title={item.title}
              icon={item.icon}
              tone={item.tone}
              value={watch(item.field)}
              onChange={(value) => {
                setPrice(item.field, value);
              }}
            />
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, theme.spacing.md) + theme.spacing.md,
          },
        ]}
      >
        <PrimaryButton
          label={mutations.updatePricing.isPending ? 'Saving...' : 'Save pricing'}
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
    backgroundColor: theme.colors.background,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  pageBackShadow: {
    flexShrink: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.32,
        shadowRadius: 10,
      },
      default: {
        elevation: 8,
      },
    }),
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    ...theme.typography.display,
    color: theme.colors.foreground,
  },
  packageColumn: {
    gap: theme.spacing.xl,
  },
  packageCard: {
    borderRadius: PRICE_CARD_RADIUS,
    overflow: 'hidden',
  },
  packageInner: {
    padding: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  packageTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  packageIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  packageTitleWrap: {
    flex: 1,
    gap: theme.spacing.xs,
    minWidth: 0,
  },
  packageTitle: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
    fontSize: 17,
  },
  packageAmount: {
    ...theme.typography.mono,
    color: 'rgba(255,255,255,0.62)',
  },
  priceEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
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
  },
  stepperPressed: {
    opacity: 0.76,
  },
  priceFieldShell: {
    flex: 1,
    height: PRICE_INPUT_HEIGHT,
    borderRadius: FIELD_RADIUS,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    overflow: 'hidden',
    position: 'relative',
  },
  fieldWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: FIELD_WASH,
  },
  currencyPrefix: {
    position: 'absolute',
    left: theme.spacing.xl,
    top: 0,
    bottom: 0,
    zIndex: 1,
    color: 'rgba(255,255,255,0.58)',
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 17,
    lineHeight: PRICE_INPUT_HEIGHT,
  },
  priceInput: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    paddingLeft: theme.spacing.xxl + theme.spacing.lg,
    paddingRight: theme.spacing.xl,
    paddingTop: 0,
    paddingBottom: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: theme.colors.foreground,
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 17,
    fontWeight: '400',
    textAlignVertical: 'center',
  },
  footer: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  saveButton: {
    alignSelf: 'stretch',
  },
});
