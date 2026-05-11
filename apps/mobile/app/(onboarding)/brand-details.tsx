import { businessOnboardingSchema } from '@plugoh/contracts';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import {
  AccentHero,
  LabeledField,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useMarketplaceMutations } from '@/hooks/use-marketplace';
import { ApiError } from '@/lib/api/error';
import { clearBasicsDraft, getBasicsDraft } from '@/lib/onboarding/basics-draft';

const BRAND_TYPES = [
  'Restaurant/Cafe',
  'D2C Brand',
  'Local Business',
  'E-commerce',
  'SaaS/Tech',
  'Agency',
  'Personal Brand',
  'Other',
] as const;
const BRAND_ONBOARDING_BUILD = 'brand-onboarding-v3';

export default function BrandDetailsScreen() {
  const mutations = useMarketplaceMutations();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandType, setBrandType] = useState<(typeof BRAND_TYPES)[number]>('Restaurant/Cafe');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const draft = getBasicsDraft();
    if (!draft) return;
    setFullName(draft.full_name);
    setPhone(draft.phone);
    setLocation(draft.location);
  }, []);

  useEffect(() => {
    if (__DEV__) {
      console.info('[brand-onboarding]', BRAND_ONBOARDING_BUILD);
    }
  }, []);

  const submit = async () => {
    const payload = {
      full_name: fullName,
      phone,
      location,
      brand_name: brandName,
      brand_type: brandType,
    };
    const parsed = businessOnboardingSchema.safeParse(payload);
    if (!parsed.success) {
      Alert.alert(
        'Could not save brand details',
        parsed.error.issues[0]?.message ?? 'Review the form and try again.',
      );
      return;
    }
    try {
      setSaving(true);
      await mutations.businessOnboarding.mutateAsync(parsed.data);
      clearBasicsDraft();
      router.replace('/(app)/(brand-tabs)');
    } catch (error) {
      if (__DEV__) {
        console.error('[brand-onboarding-submit]', BRAND_ONBOARDING_BUILD, error);
      }
      if (error instanceof ApiError) {
        Alert.alert('Could not save brand details', `${error.code}: ${error.message}`);
      } else {
        Alert.alert(
          'Could not save brand details',
          error instanceof Error ? error.message : 'Try again.',
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <AccentHero
        title="Manual brand setup"
        subtitle="This is enough to unlock discovery and booking."
      />
      <SectionTitle
        title="Business basics"
        subtitle="You can refine summary, tagline, and Instagram settings later."
      />
      <LabeledField
        label="Your name"
        value={fullName}
        onChangeText={setFullName}
        placeholder="Brand owner name"
      />
      <LabeledField
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+91 98765 43210"
      />
      <LabeledField
        label="Location"
        value={location}
        onChangeText={setLocation}
        placeholder="Hyderabad"
      />
      <LabeledField
        label="Brand name"
        value={brandName}
        onChangeText={setBrandName}
        placeholder="Plugoh Cafe"
      />
      <View style={{ gap: 8 }}>
        <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>Brand type</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {BRAND_TYPES.map((type) => {
            const active = type === brandType;
            return (
              <Pressable
                key={type}
                onPress={() => {
                  setBrandType(type);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: theme.radius.chip,
                  borderWidth: 1,
                  borderColor: active ? theme.colors.accentStrong : theme.colors.border,
                  backgroundColor: active ? theme.colors.accentSoft : theme.colors.surface,
                }}
              >
                <Text
                  style={{
                    ...theme.typography.label,
                    color: active ? theme.colors.accentStrong : theme.colors.foreground,
                  }}
                >
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <PrimaryButton
        label={saving ? 'Saving...' : 'Complete setup'}
        onPress={submit}
        disabled={saving}
      />
    </Screen>
  );
}
