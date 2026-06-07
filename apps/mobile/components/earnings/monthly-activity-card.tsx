import { EarningsBarChart } from '@/components/earnings/earnings-bar-chart';
import { GlassCard } from '@/components/ui/glass-card';
import { theme } from '@/constants/theme';
import { CARD_CLUSTER_RADIUS, CHART_TRACK_HEIGHT } from '@/lib/influencer/earnings';
import type { EarningsSummary } from '@plugoh/contracts';
import { StyleSheet, Text, View } from 'react-native';

export function MonthlyActivityCard({ data }: { data: EarningsSummary }) {
  return (
    <GlassCard style={styles.shell} contentStyle={styles.inner}>
      <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
        Monthly Activity
      </Text>
      <View style={styles.chartWrap}>
        <EarningsBarChart data={data.monthly_breakdown} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    alignSelf: 'stretch',
    flex: 1,
    minHeight: 128,
    borderRadius: CARD_CLUSTER_RADIUS,
  },
  inner: {
    flex: 1,
    minHeight: 0,
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    justifyContent: 'flex-start',
  },
  title: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
  },
  chartWrap: {
    flexGrow: 0,
    justifyContent: 'flex-end',
    minHeight: CHART_TRACK_HEIGHT,
    paddingHorizontal: theme.spacing.xs,
  },
});
