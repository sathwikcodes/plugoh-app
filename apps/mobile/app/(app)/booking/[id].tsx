import { PACKAGE_TYPES } from '@plugoh/contracts';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { LabeledField, PrimaryButton, Screen, SectionTitle } from '@/components/ui/primitives';
import { AsyncText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import { ApiError } from '@/lib/api/error';
import { getInfluencer } from '@/lib/api/endpoints';
import {
  recoverPendingBookingVerify,
  runBookingPaymentFlow,
  type BookingPaymentFlowStatus,
} from '@/lib/payments/booking-flow';
import { shouldShowInitialLoader } from '@/lib/query/loading';

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const influencer = useQuery({
    queryKey: ['creator', id],
    queryFn: () => getInfluencer(id),
    enabled: Boolean(id),
  });
  const [packageType, setPackageType] = useState<(typeof PACKAGE_TYPES)[number]>('instagram_reel');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [eventName, setEventName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<BookingPaymentFlowStatus | null>(null);
  const influencerLoading = shouldShowInitialLoader(influencer);

  const finishRecoveredBooking = async () => {
    try {
      setSubmitting(true);
      setPaymentStatus('verifying');
      const result = await recoverPendingBookingVerify();
      if (result?.campaignId) {
        router.replace({
          pathname: '/(app)/booking/success',
          params: { campaignId: result.campaignId },
        });
        return;
      }
      Alert.alert('Payment pending', 'We could not find a payment to finish yet.');
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.userMessage
          : error instanceof Error
            ? error.message
            : 'Please try again.';
      Alert.alert('Still finishing payment', message);
    } finally {
      setSubmitting(false);
      setPaymentStatus(null);
    }
  };

  const submit = async () => {
    if (!influencer.data?.id) return;
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
          objective: 'feature_product',
          timing_mode: 'asap',
          event_name: eventName || undefined,
          contact_email: contactEmail,
          contact_phone: contactPhone,
        },
        {
          onStatusChange: setFlowStatus,
        },
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
        Alert.alert('Payment received', 'Payment received. Tap retry to finish your booking.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Retry', onPress: () => void finishRecoveredBooking() },
        ]);
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
    <Screen>
      <SectionTitle
        title="Book creator"
        subtitle="Server-derived pricing, escrow hold, and campaign creation."
      />
      <View style={{ gap: theme.spacing.xs }}>
        <AsyncText
          loading={influencerLoading}
          value={influencer.data?.display_name ?? influencer.data?.ig_username}
          fallback="Creator"
          style={{ ...theme.typography.cardTitle, color: theme.colors.foreground }}
          shimmerWidth="52%"
          shimmerHeight={20}
        />
        <AsyncText
          loading={influencerLoading}
          value={
            influencer.data
              ? `Reel ₹${Math.round(influencer.data.price_per_reel ?? 0).toLocaleString('en-IN')}`
              : null
          }
          fallback="Pricing unavailable"
          style={{ ...theme.typography.label, color: theme.colors.muted }}
          shimmerWidth="36%"
          shimmerHeight={14}
        />
      </View>
      <LabeledField
        label="Package type"
        value={packageType}
        onChangeText={(value) => {
          setPackageType(PACKAGE_TYPES.find((item) => item === value) ?? 'instagram_reel');
        }}
      />
      <LabeledField
        label="Contact email"
        value={contactEmail}
        onChangeText={setContactEmail}
        keyboardType="email-address"
      />
      <LabeledField
        label="Contact phone"
        value={contactPhone}
        onChangeText={setContactPhone}
        keyboardType="phone-pad"
      />
      <LabeledField
        label="Event / notes (optional)"
        value={eventName}
        onChangeText={setEventName}
      />
      <PrimaryButton
        label={submitLabel}
        onPress={submit}
        disabled={submitting || influencerLoading || !influencer.data?.id}
      />
    </Screen>
  );
}
