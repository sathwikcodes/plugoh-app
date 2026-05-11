import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import { z } from 'zod';
import { LabeledField, PrimaryButton, Screen, SectionTitle } from '@/components/ui/primitives';
import { useInfluencerProfile, useMarketplaceMutations } from '@/hooks/use-marketplace';

const schema = z.object({
  price_per_reel: z.coerce.number().min(0),
  price_per_post: z.coerce.number().min(0),
  price_per_story: z.coerce.number().min(0),
});

export default function PricingScreen() {
  const profile = useInfluencerProfile();
  const mutations = useMarketplaceMutations();
  const { handleSubmit, setValue, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { price_per_reel: 0, price_per_post: 0, price_per_story: 0 },
  });

  useEffect(() => {
    if (!profile.data) return;
    setValue('price_per_reel', profile.data.price_per_reel ?? 0);
    setValue('price_per_post', profile.data.price_per_post ?? 0);
    setValue('price_per_story', profile.data.price_per_story ?? 0);
  }, [profile.data, setValue]);

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

  return (
    <Screen>
      <SectionTitle
        title="Pricing"
        subtitle="Expose starting rates that help brands decide quickly and confidently."
      />
      <LabeledField
        label="Reel rate"
        value={String(watch('price_per_reel'))}
        onChangeText={(value) => {
          setValue('price_per_reel', Number(value) || 0, { shouldValidate: true });
        }}
        keyboardType="numeric"
      />
      <LabeledField
        label="Post rate"
        value={String(watch('price_per_post'))}
        onChangeText={(value) => {
          setValue('price_per_post', Number(value) || 0, { shouldValidate: true });
        }}
        keyboardType="numeric"
      />
      <LabeledField
        label="Story rate"
        value={String(watch('price_per_story'))}
        onChangeText={(value) => {
          setValue('price_per_story', Number(value) || 0, { shouldValidate: true });
        }}
        keyboardType="numeric"
      />
      <PrimaryButton label="Save pricing" onPress={onSubmit} />
    </Screen>
  );
}
