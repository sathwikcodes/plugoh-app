import { AppInput } from '@/components/ui/app-input';
import { GlassCard } from '@/components/ui/glass-card';
import { BackHeader } from '@/components/ui/app-header';
import { PrimaryButton } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useInfluencerProfile, useMarketplaceMutations } from '@/hooks/use-marketplace';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

const FIELD_BORDER = 'rgba(255,255,255,0.18)';
const PRICE_CARD_RADIUS = 28;
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
  {
    field: 'price_per_reel',
    title: 'Reel Collaboration',
    icon: 'videocam-outline',
    tone: '#E76A92',
  },
  { field: 'price_per_post', title: 'Feed Feature', icon: 'image-outline', tone: '#5C84D6' },
  {
    field: 'price_per_story',
    title: 'Story Placement',
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
        <AppInput
          containerStyle={styles.priceField}
          value={textValue}
          onChangeText={(next) => {
            const digits = next.replace(/\D/g, '');
            onChange(digits ? Number(digits) : 0);
          }}
          keyboardType="number-pad"
          placeholder="0"
          accessibilityLabel={`${title} price`}
          prefix={<Text style={styles.currencyPrefix}>₹</Text>}
        />
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
      await mutations.updatePricing.mutateAsync({
        price_per_reel_paise: values.price_per_reel * 100,
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
          label={mutations.updatePricing.isPending ? 'Saving...' : 'Save rate card'}
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
  priceField: {
    flex: 1,
  },
  currencyPrefix: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.58)',
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
