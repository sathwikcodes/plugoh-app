import { CampaignAvatar } from '@/components/earnings/campaign-avatar';
import { theme } from '@/constants/theme';
import {
  formatDate,
  formatPaiseAsINR,
  statusLabel,
  truncate,
  TX_AVATAR_SIZE,
  type EarningsTransaction,
} from '@/lib/influencer/earnings';
import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const TransactionListRow = memo(function TransactionListRow({
  transaction,
  showDivider,
}: {
  transaction: EarningsTransaction;
  showDivider: boolean;
}) {
  return (
    <View style={styles.row}>
      <CampaignAvatar title={transaction.title} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {truncate(transaction.title, 28)}
        </Text>
        <Text style={styles.meta}>
          {statusLabel(transaction.status)}
          {transaction.date ? ' · ' + formatDate(transaction.date) : ''}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{formatPaiseAsINR(transaction.amount_paise)}</Text>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.34)" />
      </View>
      {showDivider ? <View style={styles.divider} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 76,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  body: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
  },
  meta: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.50)',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.xs,
    flexShrink: 0,
  },
  amount: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    position: 'absolute',
    left: theme.spacing.xl + TX_AVATAR_SIZE + theme.spacing.md,
    right: theme.spacing.xl,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
});
