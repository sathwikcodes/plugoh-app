import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useInfluencers } from '@/hooks/useInfluencers';

type InfluencerListItem = {
  id: string;
  displayName: string;
  username: string;
  city: string;
  category: string;
  startingPrice: number;
};

function getStringValue(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === 'string' ? value : undefined;
}

function getNumberValue(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  return typeof value === 'number' ? value : undefined;
}

function normalizeInfluencer(item: unknown): InfluencerListItem | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const source = item as Record<string, unknown>;
  const id = getStringValue(source, 'id');
  if (!id) {
    return null;
  }

  const displayName = getStringValue(source, 'display_name') ?? 'Influencer';
  const username = getStringValue(source, 'ig_username') ?? '';
  const city = getStringValue(source, 'city') ?? 'Unknown city';
  const category = getStringValue(source, 'category') ?? 'Other';
  const startingPrice =
    getNumberValue(source, 'starterPrice') ??
    getNumberValue(source, 'price_per_story') ??
    getNumberValue(source, 'price_per_post') ??
    getNumberValue(source, 'price_per_reel') ??
    0;

  return { id, displayName, username, city, category, startingPrice };
}

function InfluencerCard({ influencer }: { influencer: InfluencerListItem }) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{influencer.displayName || influencer.username || 'Influencer'}</Text>
      <Text style={styles.meta}>{influencer.city}</Text>
      <Text style={styles.meta}>{influencer.category}</Text>
      <Text style={styles.price}>Starting at ₹{influencer.startingPrice}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const influencers = useInfluencers();
  const influencerItems = (influencers.data ?? []).map(normalizeInfluencer).filter((item): item is InfluencerListItem => item !== null);

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
      data={influencerItems}
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
