import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import { z } from 'zod';
import { LabeledField, PrimaryButton, Screen, SectionTitle } from '@/components/ui/primitives';
import { useMarketplaceMutations, usePayout } from '@/hooks/use-marketplace';

const schema = z.object({
  upi_id: z.string().optional(),
  bank_account_no: z.string().optional(),
  bank_ifsc: z.string().optional(),
  bank_account_name: z.string().optional(),
  preferred_method: z.enum(['upi', 'bank']).default('upi'),
});

export default function PayoutScreen() {
  const payout = usePayout();
  const mutations = useMarketplaceMutations();
  const { handleSubmit, setValue, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { preferred_method: 'upi' },
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
    try {
      await mutations.updatePayout.mutateAsync(values);
      router.back();
    } catch (error) {
      Alert.alert('Could not save payout', error instanceof Error ? error.message : 'Try again.');
    }
  });

  return (
    <Screen>
      <SectionTitle
        title="Payout setup"
        subtitle="Choose UPI or bank details so completed campaigns are payout-ready."
      />
      <LabeledField
        label="UPI ID"
        value={watch('upi_id') ?? ''}
        onChangeText={(value) => {
          setValue('upi_id', value);
        }}
      />
      <LabeledField
        label="Bank account number"
        value={watch('bank_account_no') ?? ''}
        onChangeText={(value) => {
          setValue('bank_account_no', value);
        }}
      />
      <LabeledField
        label="IFSC"
        value={watch('bank_ifsc') ?? ''}
        onChangeText={(value) => {
          setValue('bank_ifsc', value);
        }}
      />
      <LabeledField
        label="Account holder name"
        value={watch('bank_account_name') ?? ''}
        onChangeText={(value) => {
          setValue('bank_account_name', value);
        }}
      />
      <PrimaryButton label="Save payout details" onPress={onSubmit} />
    </Screen>
  );
}
