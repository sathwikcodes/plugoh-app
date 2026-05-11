import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Card, PrimaryButton, Screen, SectionTitle } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { getInfluencer } from '@/lib/api/endpoints';

export default function CreatorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const influencer = useQuery({
    queryKey: ['creator', id],
    queryFn: () => getInfluencer(id),
    enabled: Boolean(id),
  });

  const data = influencer.data;

  return (
    <Screen>
      <SectionTitle
        title={data?.display_name ?? data?.ig_username ?? 'Creator'}
        subtitle={data?.bio ?? 'Creator profile'}
      />
      <Card>
        <Text style={{ ...theme.typography.body, color: theme.colors.foreground }}>
          Reel ₹{Math.round(data?.price_per_reel ?? 0).toLocaleString('en-IN')} · Post ₹
          {Math.round(data?.price_per_post ?? 0).toLocaleString('en-IN')} · Story ₹
          {Math.round(data?.price_per_story ?? 0).toLocaleString('en-IN')}
        </Text>
      </Card>
      <PrimaryButton
        label="Book creator"
        onPress={() => {
          router.push(`/(app)/booking/${id}` as never);
        }}
      />
    </Screen>
  );
}
