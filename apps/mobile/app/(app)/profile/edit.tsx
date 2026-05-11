import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import { z } from 'zod';
import { LabeledField, PrimaryButton, Screen, SectionTitle } from '@/components/ui/primitives';
import {
  useBootstrap,
  useBusinessProfile,
  useInfluencerProfile,
  useMarketplaceMutations,
} from '@/hooks/use-marketplace';

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

export default function EditProfileScreen() {
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

  return (
    <Screen>
      <SectionTitle
        title="Edit profile"
        subtitle={
          role === 'business'
            ? 'Update brand identity and summary.'
            : 'Keep your creator summary short, credible, and commercially clear.'
        }
      />
      <LabeledField
        label={role === 'business' ? 'Brand name' : 'Display name'}
        value={String(watch('display_name'))}
        onChangeText={(value) => {
          setValue('display_name', value, { shouldValidate: true });
        }}
      />
      <LabeledField
        label={role === 'business' ? 'Brand summary' : 'Bio'}
        value={String(watch('bio'))}
        onChangeText={(value) => {
          setValue('bio', value, { shouldValidate: true });
        }}
        multiline
      />
      <LabeledField
        label={role === 'business' ? 'Brand location' : 'City'}
        value={String(watch('city'))}
        onChangeText={(value) => {
          setValue('city', value, { shouldValidate: true });
        }}
      />
      <LabeledField
        label={role === 'business' ? 'Brand type' : 'Category'}
        value={String(watch('category'))}
        onChangeText={(value) => {
          setValue('category', value, { shouldValidate: true });
        }}
      />
      <PrimaryButton label="Save changes" onPress={onSubmit} />
    </Screen>
  );
}
