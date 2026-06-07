import { GlassCard } from '@/components/ui/glass-card';
import { theme } from '@/constants/theme';
import { CARD_CLUSTER_RADIUS, formatPaiseAsINR } from '@/lib/influencer/earnings';
import type { EarningsSummary } from '@plugoh/contracts';
import { StyleSheet, Text } from 'react-native';

export function TotalEarnedCard({ data }: { data: EarningsSummary }) {
  const mom = data.month_over_month_change;
  const momPct = Math.abs(mom * 100).toFixed(0);
  const momPos = mom >= 0;

  return (
    <GlassCard style={styles.shell} contentStyle={styles.inner}>
      <Text style={styles.label}>Total Earned</Text>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {formatPaiseAsINR(data.total_earnings)}
      </Text>
      {mom !== 0 && (
        <Text
          style={[styles.sub, { color: momPos ? theme.colors.success : theme.colors.danger }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {momPos ? '▲' : '▼'} {momPct}% vs last month
        </Text>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: CARD_CLUSTER_RADIUS,
  },
  inner: {
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
  },
  label: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.55)',
  },
  value: {
    ...theme.typography.section,
    color: theme.colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  sub: {
    ...theme.typography.caption,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    includeFontPadding: false,
  },
});
