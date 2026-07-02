import { BookingPackageCarousel } from '@/components/booking/booking-package-carousel';
import { CreatorSummaryCard } from '@/components/booking/creator-summary-card';
import { SlideToPayButton } from '@/components/booking/slide-to-pay-button';
import { AppInput } from '@/components/ui/app-input';
import { BackHeader } from '@/components/ui/app-header';
import { theme } from '@/constants/theme';
import { ApiError } from '@/lib/api/error';
import { getInfluencer } from '@/lib/api/endpoints';
import { runBookingPaymentFlow, type BookingPaymentFlowStatus } from '@/lib/payments/booking-flow';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import { PACKAGE_TYPES } from '@plugoh/contracts';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PackageType = (typeof PACKAGE_TYPES)[number];

export function BookingScreen({ influencerId }: { influencerId: string }) {
  const insets = useSafeAreaInsets();
  const influencer = useQuery({
    queryKey: ['creator', influencerId],
    queryFn: () => getInfluencer(influencerId),
    enabled: Boolean(influencerId),
  });
  const [packageType, setPackageType] = useState<PackageType | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<BookingPaymentFlowStatus | null>(null);
  const influencerLoading = shouldShowInitialLoader(influencer);

  const submit = async () => {
    if (!influencer.data?.id || !packageType) return;
    const currentPaymentStatus: { value: BookingPaymentFlowStatus | null } = {
      value: 'creating_order',
    };
    const setFlowStatus = (status: BookingPaymentFlowStatus) => {
      currentPaymentStatus.value = status;
      setPaymentStatus(status);
    };
    try {
      setSubmitting(true);
      setFlowStatus('creating_order');
      const result = await runBookingPaymentFlow(
        {
          influencer_profile_id: influencer.data.id,
          package_type: packageType,
          notes,
        },
        { onStatusChange: setFlowStatus },
      );
      router.replace({
        pathname: '/(app)/booking/success',
        params: { campaignId: result.campaignId },
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.userMessage
          : error instanceof Error
            ? error.message
            : 'Please try again.';
      if (message.toLowerCase().includes('cancel')) {
        Alert.alert('Payment cancelled', 'No amount was charged.');
      } else if (currentPaymentStatus.value === 'verifying') {
        Alert.alert(
          'Payment received',
          'We are finishing your campaign automatically. You can leave this screen; it will appear once verification completes.',
        );
      } else {
        Alert.alert('Booking failed', message);
      }
    } finally {
      setSubmitting(false);
      setPaymentStatus(null);
    }
  };

  const submitLabel = submitting
    ? paymentStatus === 'verifying'
      ? 'Finishing your booking...'
      : paymentStatus === 'opening_checkout'
        ? 'Opening payment...'
        : 'Preparing payment...'
    : 'Continue to payment';

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: theme.spacing.hero + theme.spacing.jumbo + insets.bottom },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackHeader
          title="Book Creator"
          onBack={() => {
            router.back();
          }}
          style={styles.pageHeaderRow}
        />

        <CreatorSummaryCard influencer={influencer.data} loading={influencerLoading} />

        <BookingPackageCarousel influencer={influencer.data} onChange={setPackageType} />

        <AppInput
          label="Additional notes"
          placeholder="Anything the creator should know? (optional)"
          value={notes}
          onChangeText={setNotes}
          autoGrow={{ maxHeight: 140 }}
        />
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, theme.spacing.md) + theme.spacing.md },
        ]}
      >
        <SlideToPayButton
          label="Slide to continue payment"
          loadingLabel={submitLabel}
          loading={submitting}
          onComplete={submit}
          disabled={submitting || influencerLoading || !influencer.data?.id || !packageType}
          style={styles.submitButton}
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
    gap: theme.spacing.xl,
  },
  pageHeaderRow: {
    marginBottom: theme.spacing.xs,
  },
  footer: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  submitButton: {
    alignSelf: 'stretch',
  },
});
