import { GlassCircleButton } from '@/components/ui/glass-circle-button';
import { PrimaryButton } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import {
  useBootstrap,
  useBusinessProfile,
  useInfluencerProfile,
  useMarketplaceMutations,
} from '@/hooks/use-marketplace';
import { zodResolver } from '@hookform/resolvers/zod';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

const FIELD_RADIUS = 28;
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

const schema = z.object({
  display_name: z.string().trim().min(1),
  bio: z.string().trim().min(1),
  city: z.string().trim().min(1),
  category: z.enum(categories),
});

function toCategory(value?: string | null): Category {
  return categories.includes(value as Category) ? (value as Category) : 'Lifestyle';
}

function GlassFormField({
  label,
  multiline,
  ...inputProps
}: TextInputProps & { label: string; multiline?: boolean }) {
  const inputStyle = multiline ? styles.fieldInputMultiline : styles.fieldInputSingle;

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <BlurView
        tint="systemUltraThinMaterialDark"
        intensity={86}
        style={[styles.blurFieldShell, multiline && styles.blurFieldShellMultiline]}
      >
        <View pointerEvents="none" style={styles.fieldWash} />
        <TextInput
          {...inputProps}
          {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          underlineColorAndroid="transparent"
          placeholderTextColor="rgba(255,255,255,0.38)"
          cursorColor="#FFFFFF"
          selectionColor="#FFFFFF"
          style={[inputStyle, inputProps.style]}
        />
      </BlurView>
    </View>
  );
}

function GlassCategorySelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Category;
  onChange: (value: Category) => void;
}) {
  const openCategoryPicker = () => {
    if (Platform.OS === 'ios') {
      const options = [...categories, 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: label,
          options,
          cancelButtonIndex: options.length - 1,
          userInterfaceStyle: 'dark',
        },
        (buttonIndex) => {
          if (buttonIndex < categories.length) {
            onChange(categories[buttonIndex]);
          }
        },
      );
      return;
    }

    Alert.alert(
      label,
      undefined,
      [
        ...categories.map((category) => ({
          text: category,
          onPress: () => {
            onChange(category);
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

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const bootstrap = useBootstrap();
  const role = bootstrap.data?.role ?? 'influencer';
  const profile = useInfluencerProfile();
  const businessProfile = useBusinessProfile();
  const mutations = useMarketplaceMutations();
  type FormValues = z.infer<typeof schema>;
  const { handleSubmit, setValue, watch } = useForm<FormValues>({
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
    setValue('category', toCategory(profile.data.category));
  }, [businessProfile.data, profile.data, role, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    const data = values;
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
            <Text style={styles.pageTitle}>Edit Profile</Text>
          </View>
        </View>

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
          <GlassFormField
            label={role === 'business' ? 'Brand location' : 'City'}
            value={watch('city')}
            onChangeText={(value) => {
              setValue('city', value, { shouldValidate: true });
            }}
          />
          <GlassCategorySelector
            label={role === 'business' ? 'Brand type' : 'Category'}
            value={watch('category')}
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
  blurFieldShellMultiline: {
    minHeight: MULTILINE_MIN_HEIGHT,
    height: undefined,
  },
  fieldWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: FIELD_WASH,
  },
  fieldLabel: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.62)',
    paddingLeft: theme.spacing.lg,
  },
  fieldInputSingle: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    paddingHorizontal: theme.spacing.xxl,
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
  fieldInputMultiline: {
    minHeight: MULTILINE_MIN_HEIGHT,
    zIndex: 1,
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
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
    flex: 1,
    color: theme.colors.foreground,
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 17,
    fontWeight: '400',
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
