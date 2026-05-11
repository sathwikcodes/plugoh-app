import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import {
  Card,
  PrimaryButton,
  Screen,
  SectionTitle,
  SecondaryButton,
  StatusChip,
} from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useBootstrap, useCampaign, useMarketplaceMutations } from '@/hooks/use-marketplace';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bootstrap = useBootstrap();
  const campaign = useCampaign(id);
  const mutations = useMarketplaceMutations();
  const role = bootstrap.data?.role ?? 'influencer';

  const handleDecline = async () => {
    try {
      await mutations.declineCampaign.mutateAsync(id);
      router.back();
    } catch (error) {
      Alert.alert('Could not decline', error instanceof Error ? error.message : 'Try again.');
    }
  };

  const handleAccept = async () => {
    try {
      await mutations.acceptCampaign.mutateAsync(id);
      await campaign.refetch();
    } catch (error) {
      Alert.alert('Could not accept', error instanceof Error ? error.message : 'Try again.');
    }
  };

  const item = campaign.data;
  const canRespond =
    role === 'influencer' &&
    item &&
    ['requested', 'payment_pending', 'pre_authorized'].includes(item.status);
  const canDeliver = item && item.status === 'in_escrow';
  const canApprove = role === 'business' && item?.status === 'delivery_submitted';

  return (
    <Screen>
      <SectionTitle
        title={item?.title ?? 'Campaign'}
        subtitle={item?.business_profile?.brand_name ?? 'Brand'}
      />
      <Card>
        <StatusChip
          label={(item?.status ?? 'loading').replaceAll('_', ' ')}
          status={item?.status}
        />
        <Text style={{ ...theme.typography.body, color: theme.colors.foreground }}>
          {item?.brief ?? 'No brief added yet.'}
        </Text>
        <Text style={{ ...theme.typography.mono, color: theme.colors.foreground }}>
          ₹{Math.round(item?.price_offered ?? 0).toLocaleString('en-IN')}
        </Text>
      </Card>
      <Card>
        <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>Timeline</Text>
        <View style={{ gap: 10 }}>
          {['requested', 'payment_pending', 'in_escrow', 'delivery_submitted', 'completed'].map(
            (step) => (
              <View key={step} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ ...theme.typography.body, color: theme.colors.foreground }}>
                  {step.replaceAll('_', ' ')}
                </Text>
                {item?.status === step ? <StatusChip label="Current" status={step} /> : null}
              </View>
            ),
          )}
        </View>
      </Card>
      {canRespond ? (
        <View style={{ gap: 12 }}>
          <PrimaryButton
            label={mutations.acceptCampaign.isPending ? 'Accepting...' : 'Accept campaign'}
            onPress={handleAccept}
          />
          <SecondaryButton label="Decline request" onPress={handleDecline} />
        </View>
      ) : null}
      {canDeliver ? (
        <PrimaryButton
          label="Submit delivery"
          onPress={() => {
            router.push(`/(app)/delivery/${id}`);
          }}
        />
      ) : null}
      {canApprove ? (
        <View style={{ gap: 12 }}>
          <PrimaryButton
            label={
              mutations.approveCampaignDelivery.isPending ? 'Approving...' : 'Approve delivery'
            }
            onPress={async () => {
              try {
                await mutations.approveCampaignDelivery.mutateAsync({
                  id,
                  idempotencyKey: `approve-${id}-${Date.now()}`,
                });
                await campaign.refetch();
              } catch (error) {
                Alert.alert(
                  'Could not approve',
                  error instanceof Error ? error.message : 'Try again.',
                );
              }
            }}
          />
          <SecondaryButton
            label="Dispute delivery"
            onPress={async () => {
              try {
                await mutations.disputeCampaignDelivery.mutateAsync({
                  id,
                  reason: 'Needs revision',
                });
                await campaign.refetch();
              } catch (error) {
                Alert.alert(
                  'Could not dispute',
                  error instanceof Error ? error.message : 'Try again.',
                );
              }
            }}
          />
        </View>
      ) : null}
    </Screen>
  );
}
