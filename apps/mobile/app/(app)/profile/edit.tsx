import { GlassCard } from '@/components/ui/glass-card';
import { PrimaryButton, SectionTitle } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import {
  useBootstrap,
  useBusinessProfile,
  useInfluencerProfile,
  useMarketplaceMutations,
} from '@/hooks/use-marketplace';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

/** Matches profile settings glass groups (`profile/index.tsx`). */
const GLASS_FIELD_RADIUS = 28;

/** Single-line row height inside the glass pill (roomy, easy to tap). */
const SINGLE_LINE_INNER_H = 50;
/** One-line text metrics; vertical padding = (inner H − line H) / 2 centers the line in the pill. */
const SINGLE_LINE_LINE_HEIGHT = 24;
const SINGLE_LINE_PAD_V = (SINGLE_LINE_INNER_H - SINGLE_LINE_LINE_HEIGHT) / 2;
/** Multiline bio minimum inner height. */
const MULTILINE_MIN_INNER_H = 120;

const categories = [
  'Food',
  'Fitness',
  'Beauty',
  'Lifestyle',
  'Travel',
  'Education',
  'Tech',
  'Fashion',
  'Other',
] as const;

const schema = z.object({
  display_name: z.string().trim().min(1),
  bio: z.string().trim().min(1),
  city: z.string().trim().min(1),
  category: z.enum(categories),
});

function GlassFormField({
  label,
  multiline,
  ...inputProps
}: TextInputProps & { label: string; multiline?: boolean }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <GlassCard
        style={styles.glassShell}
        contentStyle={multiline ? styles.glassInnerMultiline : styles.glassInnerSingle}
      >
        <TextInput
          {...inputProps}
          {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
          multiline={multiline}
          textAlignVertical="top"
          underlineColorAndroid="transparent"
          placeholderTextColor="rgba(255,255,255,0.38)"
          style={[
            multiline ? styles.fieldInputMultiline : styles.fieldInputSingle,
            inputProps.style,
          ]}
        />
      </GlassCard>
    </View>
  );
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const bootstrap = useBootstrap();
  const role = bootstrap.data?.role ?? 'influencer';
  const profile = useInfluencerProfile();
  const businessProfile = useBusinessProfile();
  const mutations = useMarketplaceMutations();
  type FormValues = z.infer<typeof schema>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { handleSubmit, setValue, watch } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: { display_name: '', bio: '', city: '', category: 'Lifestyle' },
  });

  useEffect(() => {
    if (role === 'business') {
      if (!businessProfile.data) return;
      setValue('display_name', businessProfile.data.brand_name ?? '');
      setValue('bio', businessProfile.data.brand_summary ?? '');
      setValue('city', businessProfile.data.brand_location ?? '');
      setValue(
        'category',
        (businessProfile.data.brand_type as FormValues['category'] | undefined) ?? 'Other',
      );
      return;
    }
    if (!profile.data) return;
    setValue('display_name', profile.data.display_name ?? '');
    setValue('bio', profile.data.bio ?? '');
    setValue('city', profile.data.city ?? '');
    setValue('category', profile.data.category ?? 'Lifestyle');
  }, [businessProfile.data, profile.data, role, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    const data = values as FormValues;
    try {
      if (role === 'business') {
        await mutations.updateBusinessProfile.mutateAsync({
          brand_name: data.display_name,
          brand_summary: data.bio,
          brand_location: data.city,
          brand_type: data.category as Parameters<
            typeof mutations.updateBusinessProfile.mutateAsync
          >[0]['brand_type'],
        });
      } else {
        await mutations.updateProfile.mutateAsync(data);
      }
      router.back();
    } catch (error) {
      Alert.alert(
        'Could not update profile',
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
        <View style={styles.headerBlock}>
          <SectionTitle
            title="Edit profile"
            subtitle={
              role === 'business'
                ? 'Update brand identity and summary.'
                : 'Keep your creator summary short, credible, and commercially clear.'
            }
          />
        </View>

        <View style={styles.fieldsColumn}>
          <GlassFormField
            label={role === 'business' ? 'Brand name' : 'Display name'}
            value={String(watch('display_name'))}
            onChangeText={(value) => {
              setValue('display_name', value, { shouldValidate: true });
            }}
          />
          <GlassFormField
            label={role === 'business' ? 'Brand summary' : 'Bio'}
            value={String(watch('bio'))}
            onChangeText={(value) => {
              setValue('bio', value, { shouldValidate: true });
            }}
            multiline
          />
          <GlassFormField
            label={role === 'business' ? 'Brand location' : 'City'}
            value={String(watch('city'))}
            onChangeText={(value) => {
              setValue('city', value, { shouldValidate: true });
            }}
          />
          <GlassFormField
            label={role === 'business' ? 'Brand type' : 'Category'}
            value={String(watch('category'))}
            onChangeText={(value) => {
              setValue('category', value, { shouldValidate: true });
            }}
          />
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
        <PrimaryButton label="Save changes" onPress={onSubmit} style={styles.saveButton} />
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
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.xl,
  },
  headerBlock: {
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  fieldsColumn: {
    gap: theme.spacing.xl,
  },
  fieldBlock: {
    gap: theme.spacing.md,
  },
  glassShell: {
    alignSelf: 'stretch',
    borderRadius: GLASS_FIELD_RADIUS,
    borderCurve: 'continuous',
  },
  /** Fixed height shell; TextInput is absolutely inset so it fills the whole pill. */
  glassInnerSingle: {
    height: SINGLE_LINE_INNER_H,
    padding: 0,
    position: 'relative',
  },
  glassInnerMultiline: {
    minHeight: MULTILINE_MIN_INNER_H,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    position: 'relative',
  },
  fieldLabel: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.2,
  },
  /** Fills `glassInnerSingle`; symmetric vertical padding centers the line in the pill (iOS + Android). */
  fieldInputSingle: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: SINGLE_LINE_PAD_V,
    paddingBottom: SINGLE_LINE_PAD_V,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: theme.colors.foreground,
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: SINGLE_LINE_LINE_HEIGHT,
    textAlignVertical: 'top',
  },
  /** Full-width typing area; grows with content past `MULTILINE_MIN_INNER_H`. */
  fieldInputMultiline: {
    alignSelf: 'stretch',
    zIndex: 1,
    minHeight: MULTILINE_MIN_INNER_H - theme.spacing.md * 2,
    paddingHorizontal: 0,
    paddingVertical: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: theme.colors.foreground,
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    textAlignVertical: 'top',
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
