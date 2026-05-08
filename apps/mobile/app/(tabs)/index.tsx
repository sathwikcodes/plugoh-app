import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import type { Influencer } from '@plugoh/contracts';
import { useInfluencers } from '@/hooks/useInfluencers';

function InfluencerCard({ influencer }: { influencer: Influencer }) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{influencer.display_name ?? influencer.ig_username ?? 'Influencer'}</Text>
      <Text style={styles.meta}>{influencer.city ?? 'Unknown city'}</Text>
      <Text style={styles.meta}>{influencer.category ?? 'Other'}</Text>
      <Text style={styles.price}>
        Starting at ₹{influencer.starterPrice ?? influencer.price_per_story ?? influencer.price_per_post ?? influencer.price_per_reel ?? 0}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const influencers = useInfluencers();

  if (influencers.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (influencers.isError) {
    return (
      <View style={styles.centered}>
        <Text>{influencers.error instanceof Error ? influencers.error.message : 'Failed to load influencers'}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={influencers.data ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <InfluencerCard influencer={item} />}
      ListEmptyComponent={<Text style={styles.empty}>No influencers found.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    backgroundColor: '#fff',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    marginTop: 4,
    color: '#555',
  },
  price: {
    marginTop: 8,
    fontWeight: '500',
  },
  empty: {
    textAlign: 'center',
    color: '#555',
    marginTop: 40,
  },
});
