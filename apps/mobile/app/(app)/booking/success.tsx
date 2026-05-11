import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Card, PrimaryButton, Screen, SectionTitle } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';

export default function BookingSuccessScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();

  return (
    <Screen>
      <SectionTitle
        title="Booking created"
        subtitle="Payment pre-authorization completed and campaign requested."
      />
      <Card>
        <Text style={{ ...theme.typography.body, color: theme.colors.foreground }}>
          Campaign ID: {campaignId}
        </Text>
      </Card>
      <PrimaryButton
        label="Open campaigns"
        onPress={() => {
          router.replace('/(app)/(brand-tabs)/campaigns');
        }}
      />
    </Screen>
  );
}
