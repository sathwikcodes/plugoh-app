import { TransactionListRow } from '@/components/earnings/transaction-list-row';
import { GlassCard } from '@/components/ui/glass-card';
import { theme } from '@/constants/theme';
import type { EarningsTransaction } from '@/lib/influencer/earnings';
import labIcon from '@/assets/images/lab.png';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const MAX_VISIBLE_TRANSACTIONS = 10;

export function RecentTransactionsSection({
  transactions,
}: {
  transactions: EarningsTransaction[];
}) {
  // Capped at 10 — a plain map is correct here; virtualization (FlashList) would add
  // a dependency and overhead for a list that can never grow large.
  const visibleTransactions = transactions.slice(0, MAX_VISIBLE_TRANSACTIONS);

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Recent Transactions</Text>
        </View>
        <View style={styles.filterIcon}>
          <Image
            source={labIcon}
            style={styles.filterIconImage}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
      </View>

      {visibleTransactions.length === 0 ? (
        <GlassCard style={styles.listShell} contentStyle={styles.emptyInner}>
          <Text style={styles.emptyText}>No earnings yet.</Text>
        </GlassCard>
      ) : (
        <GlassCard style={styles.listShell} contentStyle={styles.listInner}>
          {visibleTransactions.map((transaction, index) => (
            <TransactionListRow
              key={transaction.campaignId}
              transaction={transaction}
              showDivider={index < visibleTransactions.length - 1}
            />
          ))}
        </GlassCard>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    gap: theme.spacing.xs,
  },
  title: {
    ...theme.typography.section,
    color: theme.colors.foreground,
  },
  filterIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -10 }, { translateY: 5 }],
  },
  filterIconImage: {
    width: 18,
    height: 18,
  },
  listShell: {
    width: '100%',
    borderRadius: 38,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  listInner: {
    paddingVertical: theme.spacing.sm,
  },
  emptyInner: {
    minHeight: 116,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
    textAlign: 'center',
  },
});
