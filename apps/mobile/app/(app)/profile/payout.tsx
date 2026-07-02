import { AppInput } from '@/components/ui/app-input';
import { BackHeader } from '@/components/ui/app-header';
import { PrimaryButton } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useMarketplaceMutations, usePayout } from '@/hooks/use-marketplace';
import { Ionicons } from '@expo/vector-icons';
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
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

const FIELD_RADIUS = 24;
const FIELD_BORDER = 'rgba(255,255,255,0.18)';
const FIELD_WASH = 'rgba(255,255,255,0.055)';
const SINGLE_LINE_HEIGHT = 58;

const payoutMethods = ['upi', 'bank'] as const;

const schema = z.object({
  upi_id: z.string().optional(),
  bank_account_no: z.string().optional(),
  bank_ifsc: z.string().optional(),
  bank_account_name: z.string().optional(),
  preferred_method: z.enum(payoutMethods),
});

type FormValues = z.infer<typeof schema>;
type PayoutMethod = FormValues['preferred_method'];

function methodLabel(method: PayoutMethod) {
  return method === 'upi' ? 'UPI' : 'Bank account';
}

function GlassPayoutField({
  label,
  style,
  ...inputProps
}: TextInputProps & {
  label: string;
}) {
  return <AppInput {...inputProps} label={label} inputStyle={style} />;
}

function GlassMethodSelector({
  value,
  onChange,
}: {
  value: PayoutMethod;
  onChange: (value: PayoutMethod) => void;
}) {
  const label = 'Preferred method';

  const openMethodPicker = () => {
    if (Platform.OS === 'ios') {
      const options = ['UPI', 'Bank account', 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: label,
          options,
          cancelButtonIndex: options.length - 1,
          userInterfaceStyle: 'dark',
        },
        (buttonIndex) => {
          if (buttonIndex < payoutMethods.length) {
            onChange(payoutMethods[buttonIndex]);
          }
        },
      );
      return;
    }

    Alert.alert(
      label,
      undefined,
      [
        {
          text: 'UPI',
          onPress: () => {
            onChange('upi');
          },
        },
        {
          text: 'Bank account',
          onPress: () => {
            onChange('bank');
          },
        },
        { text: 'Cancel', style: 'cancel' },
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
          accessibilityValue={{ text: methodLabel(value) }}
          onPress={openMethodPicker}
          style={({ pressed }) => [styles.selectorPressable, pressed && styles.selectorPressed]}
        >
          <Text style={styles.selectorText} numberOfLines={1}>
            {methodLabel(value)}
          </Text>
          <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.66)" />
        </Pressable>
      </BlurView>
    </View>
  );
}

export default function PayoutScreen() {
  const insets = useSafeAreaInsets();
  const payout = usePayout();
  const mutations = useMarketplaceMutations();
  const { handleSubmit, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      upi_id: '',
      bank_account_no: '',
      bank_ifsc: '',
      bank_account_name: '',
      preferred_method: 'upi',
    },
  });

  useEffect(() => {
    if (!payout.data) return;
    setValue('upi_id', payout.data.upi_id ?? '');
    setValue('bank_account_no', payout.data.bank_account_no ?? '');
    setValue('bank_ifsc', payout.data.bank_ifsc ?? '');
    setValue('bank_account_name', payout.data.bank_account_name ?? '');
    setValue('preferred_method', payout.data.preferred_method);
  }, [payout.data, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    if (values.preferred_method === 'upi') {
      if (!values.upi_id?.trim()) {
        Alert.alert('Add your UPI ID', 'Enter a UPI ID so we can send your payouts.');
        return;
      }
    } else if (
      !values.bank_account_no?.trim() ||
      !values.bank_ifsc?.trim() ||
      !values.bank_account_name?.trim()
    ) {
      Alert.alert(
        'Complete your bank details',
        'Enter your account number, IFSC, and account holder name.',
      );
      return;
    }
    try {
      await mutations.updatePayout.mutateAsync(values);
      router.back();
    } catch (error) {
      Alert.alert(
        'Could not save payout account',
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
          title="Payout"
          onBack={() => {
            router.back();
          }}
          style={styles.pageHeaderRow}
        />

        <View style={styles.fieldsColumn}>
          <GlassMethodSelector
            value={watch('preferred_method')}
            onChange={(value) => {
              setValue('preferred_method', value, { shouldValidate: true });
            }}
          />
          {watch('preferred_method') === 'upi' ? (
            <GlassPayoutField
              label="UPI ID"
              value={watch('upi_id') ?? ''}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={(value) => {
                setValue('upi_id', value, { shouldValidate: true });
              }}
            />
          ) : (
            <>
              <GlassPayoutField
                label="Bank account number"
                value={watch('bank_account_no') ?? ''}
                keyboardType="number-pad"
                onChangeText={(value) => {
                  setValue('bank_account_no', value, { shouldValidate: true });
                }}
              />
              <GlassPayoutField
                label="IFSC"
                value={watch('bank_ifsc') ?? ''}
                autoCapitalize="characters"
                autoCorrect={false}
                onChangeText={(value) => {
                  setValue('bank_ifsc', value.toUpperCase(), { shouldValidate: true });
                }}
              />
              <GlassPayoutField
                label="Account holder name"
                value={watch('bank_account_name') ?? ''}
                autoCapitalize="words"
                onChangeText={(value) => {
                  setValue('bank_account_name', value, { shouldValidate: true });
                }}
              />
            </>
          )}
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
          label={mutations.updatePayout.isPending ? 'Saving...' : 'Save'}
          disabled={mutations.updatePayout.isPending}
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
});
