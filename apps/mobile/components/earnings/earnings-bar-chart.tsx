import {
  buildCalendarYearMonthlySeries,
  CHART_BAR_GAP,
  CHART_BAR_WIDTH,
  CHART_TRACK_HEIGHT,
  formatPaiseAsINR,
} from '@/lib/influencer/earnings';
import type { EarningsSummary } from '@plugoh/contracts';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

const PILL_RADIUS = CHART_BAR_WIDTH / 2;

export function EarningsBarChart({ data }: { data: EarningsSummary['monthly_breakdown'] }) {
  const { series, maxVal } = useMemo(() => {
    const built = buildCalendarYearMonthlySeries(data);
    return { series: built, maxVal: Math.max(...built.map((d) => d.amount), 1) };
  }, [data]);

  return (
    <View style={styles.chartArea}>
      {series.map((d) => {
        const ratio = d.amount / maxVal;
        const fillH = d.amount <= 0 ? 0 : Math.max(2, Math.round(ratio * CHART_TRACK_HEIGHT));
        return (
          <View
            key={d.month}
            style={styles.slot}
            accessibilityLabel={`${d.label} earnings ${formatPaiseAsINR(d.amount)}`}
          >
            <View style={styles.track}>
              {fillH > 0 ? (
                <View style={[styles.fillWrap, { height: fillH }]}>
                  <LinearGradient
                    colors={['#FB923C', '#C084FC', '#7C3AED']}
                    locations={[0, 0.55, 1]}
                    start={{ x: 0.5, y: 1 }}
                    end={{ x: 0.5, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    height: CHART_TRACK_HEIGHT,
    gap: CHART_BAR_GAP,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  track: {
    width: CHART_BAR_WIDTH,
    height: CHART_TRACK_HEIGHT,
    borderRadius: PILL_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    position: 'relative',
  },
  fillWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: PILL_RADIUS,
    borderTopRightRadius: PILL_RADIUS,
    overflow: 'hidden',
  },
});
