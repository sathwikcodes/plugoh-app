import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Card, PrimaryButton, Screen } from '@/components/ui/primitives';
import { AsyncText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import { getInfluencer } from '@/lib/api/endpoints';
import { shouldShowInitialLoader } from '@/lib/query/loading';

export default function CreatorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const influencer = useQuery({
    queryKey: ['creator', id],
    queryFn: () => getInfluencer(id),
    enabled: Boolean(id),
  });

  const data = influencer.data;
  const loading = shouldShowInitialLoader(influencer);

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm }}>
        <AsyncText
          loading={loading}
          value={data?.display_name ?? data?.ig_username}
          fallback="Creator"
          style={{ ...theme.typography.section, color: theme.colors.foreground }}
          shimmerWidth="58%"
          shimmerHeight={24}
        />
        <AsyncText
          loading={loading}
          value={data?.bio}
          fallback="Creator profile"
          style={{ ...theme.typography.body, color: theme.colors.muted }}
          shimmerWidth="82%"
          shimmerHeight={18}
        />
      </View>
      <Card>
        {loading ? (
          <AsyncText
            loading
            value={null}
            style={{ ...theme.typography.body, color: theme.colors.foreground }}
            shimmerWidth="88%"
            shimmerHeight={18}
          />
        ) : (
          <Text style={{ ...theme.typography.body, color: theme.colors.foreground }}>
            Reel ₹{Math.round(data?.price_per_reel ?? 0).toLocaleString('en-IN')} · Post ₹
            {Math.round(data?.price_per_post ?? 0).toLocaleString('en-IN')} · Story ₹
            {Math.round(data?.price_per_story ?? 0).toLocaleString('en-IN')}
          </Text>
        )}
      </Card>
      <PrimaryButton
        label="Book creator"
        onPress={() => {
          router.push(`/(app)/booking/${id}`);
        }}
      />
    </Screen>
  );
}
