import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { LabeledField, PrimaryButton, Screen, SectionTitle } from '@/components/ui/primitives';
import { AsyncText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import { getInfluencer } from '@/lib/api/endpoints';
import { runBookingPaymentFlow } from '@/lib/payments/booking-flow';
import { shouldShowInitialLoader } from '@/lib/query/loading';

const PACKAGE_TYPES = ['reel', 'post', 'story', 'reel+story', 'reel+post'] as const;

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const influencer = useQuery({
    queryKey: ['creator', id],
    queryFn: () => getInfluencer(id),
    enabled: Boolean(id),
  });
  const [packageType, setPackageType] = useState<(typeof PACKAGE_TYPES)[number]>('reel');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [eventName, setEventName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const influencerLoading = shouldShowInitialLoader(influencer);

  const submit = async () => {
    if (!influencer.data?.id) return;
    try {
      setSubmitting(true);
      const result = await runBookingPaymentFlow({
        influencer_profile_id: influencer.data.id,
        package_type: packageType,
        objective: 'feature_product',
        timing_mode: 'asap',
        event_name: eventName || undefined,
        contact_email: contactEmail,
        contact_phone: contactPhone,
      });
      router.replace({
        pathname: '/(app)/booking/success',
        params: { campaignId: result.campaignId },
      });
    } catch (error) {
      Alert.alert('Booking failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

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
          setPackageType(PACKAGE_TYPES.find((item) => item === value) ?? 'reel');
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
        label={submitting ? 'Processing...' : 'Continue to payment'}
        onPress={submit}
        disabled={submitting || influencerLoading || !influencer.data?.id}
      />
    </Screen>
  );
}
