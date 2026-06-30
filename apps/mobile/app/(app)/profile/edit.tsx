import { AppInput } from '@/components/ui/app-input';
import { BackHeader } from '@/components/ui/app-header';
import { PrimaryButton } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import {
  useBootstrap,
  useBusinessProfile,
  useInfluencerProfile,
  useMarketplaceMutations,
} from '@/hooks/use-marketplace';
import { BRAND_CATEGORY_OPTIONS, type BrandCategory } from '@/lib/onboarding/premium-flow';
import { profileLocationChannel, type LocationSelection } from '@/lib/location/location-selection';
import { influencerProfileImageUri } from '@/lib/influencer/profile-image';
import { businessProfileImageUri } from '@/lib/brand/profile-image';
import { zodResolver } from '@hookform/resolvers/zod';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

const PHOTO_SIZE = 92;
const BADGE_SIZE = 30;

function ProfilePhotoSection({ imageUri }: { imageUri: string | null | undefined }) {
  return (
    <View style={styles.photoSection}>
      <Pressable
        onPress={() => {}}
        accessibilityLabel="Edit profile photo"
        accessibilityRole="button"
        style={({ pressed }) => [styles.photoWrap, pressed && { opacity: 0.82 }]}
      >
        <View style={styles.photoRing}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="person" size={38} color="rgba(255,255,255,0.38)" />
            </View>
          )}
        </View>
        <View style={styles.editBadgeWrap}>
          {isLiquidGlassAvailable() ? (
            <GlassView glassEffectStyle="regular" colorScheme="dark" style={styles.editBadge}>
              <Ionicons name="pencil" size={13} color="rgba(255,255,255,0.92)" />
            </GlassView>
          ) : (
            <BlurView tint="systemUltraThinMaterialDark" intensity={90} style={styles.editBadge}>
              <Ionicons name="pencil" size={13} color="rgba(255,255,255,0.92)" />
            </BlurView>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const FIELD_RADIUS = 24;
const FIELD_BORDER = 'rgba(255,255,255,0.18)';
const FIELD_WASH = 'rgba(255,255,255,0.055)';

/** Roomy iOS-sized rows; min 44pt touch target with enough breathing room for the blur shell. */
const SINGLE_LINE_HEIGHT = 58;
const MULTILINE_MIN_HEIGHT = 132;

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

type Category = (typeof categories)[number];

const categoryApiValues = {
  Food: 'food',
  Fitness: 'fitness',
  Beauty: 'beauty',
  Lifestyle: 'lifestyle',
  Travel: 'travel',
  Education: 'education',
  Tech: 'tech',
  Fashion: 'fashion',
  Other: 'other',
} as const;

const schema = z.object({
  display_name: z.string().trim().min(1),
  bio: z.string().trim().min(1),
  city: z.string().trim().min(1),
  category: z.string().trim().min(1),
});

const influencerCategoryOptions = categories.map((category) => ({
  label: category,
  value: category,
}));

type SelectorOption<T extends string> = {
  label: string;
  value: T;
};

function toCategory(value?: string | null): Category {
  const normalized = value?.toLowerCase();
  return categories.find((category) => categoryApiValues[category] === normalized) ?? 'Lifestyle';
}

function toBrandType(value?: string | null): BrandCategory {
  const normalized = value?.toLowerCase();
  return (
    BRAND_CATEGORY_OPTIONS.find((option) => option.value === normalized)?.value ??
    BRAND_CATEGORY_OPTIONS.find((option) => option.label.toLowerCase() === normalized)?.value ??
    'other'
  );
}

function brandTypeLabel(value?: string | null) {
  const brandType = toBrandType(value);
  return BRAND_CATEGORY_OPTIONS.find((option) => option.value === brandType)?.label ?? 'Other';
}

function brandTypeValue(label: string): BrandCategory {
  return (
    BRAND_CATEGORY_OPTIONS.find((option) => option.label === label || option.value === label)
      ?.value ?? 'other'
  );
}

function GlassFormField({
  label,
  multiline,
  style,
  ...inputProps
}: TextInputProps & { label: string; multiline?: boolean }) {
  return (
    <AppInput
      {...inputProps}
      label={label}
      multiline={multiline}
      inputStyle={style}
      fieldStyle={multiline ? styles.multilineShell : undefined}
    />
  );
}

function GlassCategorySelector({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly SelectorOption<string>[];
  onChange: (value: string) => void;
}) {
  const openCategoryPicker = () => {
    if (Platform.OS === 'ios') {
      const labels = [...options.map((option) => option.label), 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: label,
          options: labels,
          cancelButtonIndex: labels.length - 1,
          userInterfaceStyle: 'dark',
        },
        (buttonIndex) => {
          if (buttonIndex < options.length) {
            onChange(options[buttonIndex].label);
          }
        },
      );
      return;
    }

    Alert.alert(
      label,
      undefined,
      [
        ...options.map((option) => ({
          text: option.label,
          onPress: () => {
            onChange(option.label);
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
      { cancelable: true },
    );
  };

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <BlurView tint="systemUltraThinMaterialDark" intensity={86} style={styles.blurFieldShell}>
        <View pointerEvents="none" style={styles.fieldWash} />
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="button"
          accessibilityState={{ selected: true }}
          accessibilityValue={{ text: value }}
          onPress={openCategoryPicker}
          style={({ pressed }) => [styles.selectorPressable, pressed && styles.selectorPressed]}
        >
          <Text style={styles.selectorText} numberOfLines={1}>
            {value}
          </Text>
          <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.66)" />
        </Pressable>
      </BlurView>
    </View>
  );
}

function GlassLocationSelector({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <BlurView tint="systemUltraThinMaterialDark" intensity={86} style={styles.blurFieldShell}>
        <View pointerEvents="none" style={styles.fieldWash} />
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="button"
          accessibilityValue={{ text: value || 'Choose location' }}
          onPress={onPress}
          style={({ pressed }) => [styles.selectorPressable, pressed && styles.selectorPressed]}
        >
          <Text style={styles.selectorText} numberOfLines={1}>
            {value || 'Choose location'}
          </Text>
          <Ionicons name="map-outline" size={20} color="rgba(255,255,255,0.66)" />
        </Pressable>
      </BlurView>
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
  const [businessLocation, setBusinessLocation] = useState<LocationSelection | null>(null);
  type FormValues = z.infer<typeof schema>;
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { display_name: '', bio: '', city: '', category: 'Lifestyle' },
  });

  useEffect(() => {
    if (role === 'business') {
      if (!businessProfile.data) return;
      setValue('display_name', businessProfile.data.brand_name ?? '');
      setValue('bio', businessProfile.data.brand_summary ?? '');
      setValue('city', businessProfile.data.brand_location ?? '');
      setValue('category', brandTypeLabel(businessProfile.data.brand_type));
      if (
        typeof businessProfile.data.brand_latitude === 'number' &&
        typeof businessProfile.data.brand_longitude === 'number'
      ) {
        setBusinessLocation({
          label: businessProfile.data.brand_location ?? 'Selected location',
          latitude: businessProfile.data.brand_latitude,
          longitude: businessProfile.data.brand_longitude,
        });
      } else {
        setBusinessLocation(null);
      }
      return;
    }
    if (!profile.data) return;
    setValue('display_name', profile.data.display_name ?? '');
    setValue('bio', profile.data.bio ?? '');
    setValue('city', profile.data.city ?? '');
    setValue('category', toCategory(profile.data.category));
  }, [businessProfile.data, profile.data, role, setValue]);

  useFocusEffect(
    useCallback(() => {
      const applySelection = (selection: LocationSelection) => {
        setBusinessLocation(selection);
        setValue('city', selection.label, { shouldValidate: true, shouldDirty: true });
      };
      const consumed = profileLocationChannel.consume();
      if (consumed) applySelection(consumed);
      return profileLocationChannel.subscribe(applySelection);
    }, [setValue]),
  );

  const onSubmit = handleSubmit(async (values) => {
    const data = values;
    try {
      if (role === 'business') {
        const payload: Parameters<typeof mutations.updateBusinessProfile.mutateAsync>[0] = {
          brand_name: data.display_name,
          brand_summary: data.bio,
          brand_category: brandTypeValue(data.category),
        };
        if (businessLocation) {
          payload.brand_location = businessLocation.label;
          payload.brand_latitude = businessLocation.latitude;
          payload.brand_longitude = businessLocation.longitude;
        }
        await mutations.updateBusinessProfile.mutateAsync(payload);
      } else {
        const category = toCategory(data.category);
        await mutations.updateProfile.mutateAsync({
          ...data,
          category: categoryApiValues[category],
        });
      }
      router.back();
    } catch (error) {
      Alert.alert(
        'Could not update profile',
        error instanceof Error ? error.message : 'Try again.',
      );
    }
  });

  const imageUri =
    role === 'business'
      ? businessProfileImageUri(businessProfile.data)
      : influencerProfileImageUri(profile.data);

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
          title="Personal Info"
          onBack={() => {
            router.back();
          }}
          style={styles.pageHeaderRow}
        />

        <ProfilePhotoSection imageUri={imageUri} />

        <View style={styles.fieldsColumn}>
          <GlassFormField
            label={role === 'business' ? 'Brand name' : 'Display name'}
            value={watch('display_name')}
            onChangeText={(value) => {
              setValue('display_name', value, { shouldValidate: true });
            }}
          />
          <GlassFormField
            label={role === 'business' ? 'Brand summary' : 'Bio'}
            value={watch('bio')}
            onChangeText={(value) => {
              setValue('bio', value, { shouldValidate: true });
            }}
            multiline
          />
          {role === 'business' ? (
            <GlassLocationSelector
              label="Brand location"
              value={watch('city')}
              onPress={() => {
                router.push('/(app)/profile/location-picker');
              }}
            />
          ) : (
            <GlassFormField
              label="City"
              value={watch('city')}
              onChangeText={(value) => {
                setValue('city', value, { shouldValidate: true });
              }}
            />
          )}
          <GlassCategorySelector
            label={role === 'business' ? 'Brand type' : 'Category'}
            value={watch('category')}
            options={role === 'business' ? BRAND_CATEGORY_OPTIONS : influencerCategoryOptions}
            onChange={(value) => {
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
        <PrimaryButton
          label="Save changes"
          loading={isSubmitting}
          disabled={isSubmitting}
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
  fieldsColumn: {
    gap: theme.spacing.xxl,
  },
  fieldBlock: {
    gap: theme.spacing.sm,
  },
  blurFieldShell: {
    height: SINGLE_LINE_HEIGHT,
    borderRadius: FIELD_RADIUS,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    overflow: 'hidden',
    position: 'relative',
  },
  multilineShell: {
    height: MULTILINE_MIN_HEIGHT,
  },
  fieldWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: FIELD_WASH,
  },
  fieldLabel: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.74)',
    paddingLeft: 4,
  },
  selectorPressable: {
    flex: 1,
    zIndex: 1,
    minHeight: SINGLE_LINE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xxl,
  },
  selectorPressed: {
    opacity: 0.78,
  },
  selectorText: {
    ...theme.typography.body,
    flex: 1,
    color: theme.colors.foreground,
  },
  footer: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  saveButton: {
    alignSelf: 'stretch',
  },
  photoSection: {
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  photoWrap: {
    position: 'relative',
  },
  photoRing: {
    width: PHOTO_SIZE + 6,
    height: PHOTO_SIZE + 6,
    borderRadius: (PHOTO_SIZE + 6) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
  },
  photoPlaceholder: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadgeWrap: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  editBadge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.24)',
  },
});
