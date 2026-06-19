import { BackHeader } from '@/components/ui/app-header';
import { GlassCard } from '@/components/ui/glass-card';
import { Screen } from '@/components/ui/primitives';
import { ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import { useSavedCards } from '@/hooks/use-marketplace';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import { Ionicons } from '@expo/vector-icons';
import type { SavedCardSummary } from '@plugoh/contracts';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

function cardTitle(card: SavedCardSummary) {
  return card.brand || card.network || 'Saved card';
}

function cardSubtitle(card: SavedCardSummary) {
  const parts = [card.type, card.issuer].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Card saved from booking payment';
}

export default function SavedCardsScreen() {
  const savedCards = useSavedCards();
  const loading = shouldShowInitialLoader(savedCards);
  const cards = savedCards.data ?? [];

  return (
    <Screen contentContainerStyle={styles.content}>
      <BackHeader
        title="Saved cards"
        onBack={() => {
          router.back();
        }}
        style={styles.header}
      />

      {loading ? (
        <GlassCard style={styles.card}>
          <ShimmerText width="46%" height={18} />
          <ShimmerText width="70%" height={14} />
        </GlassCard>
      ) : cards.length > 0 ? (
        cards.map((card) => (
          <GlassCard key={card.id} style={styles.card} contentStyle={styles.cardContent}>
            <View style={styles.cardIcon}>
              <Ionicons name="card-outline" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardName}>{cardTitle(card)}</Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                {card.last4 ? `···· ${card.last4}` : 'Card details saved securely'}
              </Text>
              <Text style={styles.cardHint} numberOfLines={1}>
                {cardSubtitle(card)}
              </Text>
            </View>
          </GlassCard>
        ))
      ) : (
        <GlassCard style={styles.card} contentStyle={styles.emptyContent}>
          <View style={styles.emptyIcon}>
            <Ionicons name="card-outline" size={24} color="rgba(255,255,255,0.82)" />
          </View>
          <Text style={styles.emptyTitle}>No saved cards</Text>
          <Text style={styles.emptyCopy}>
            Cards appear here after a booking payment is verified.
          </Text>
        </GlassCard>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.xs,
  },
  card: {
    borderRadius: 28,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    ...theme.typography.bodyStrong,
    color: theme.colors.foreground,
  },
  cardMeta: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.72)',
  },
  cardHint: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.42)',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    marginBottom: theme.spacing.xs,
  },
  emptyTitle: {
    ...theme.typography.section,
    color: theme.colors.foreground,
  },
  emptyCopy: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.56)',
    textAlign: 'center',
  },
});
