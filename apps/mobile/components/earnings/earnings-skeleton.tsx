import { GlassCard } from '@/components/ui/glass-card';
import { ShimmerBlock, ShimmerCircle, ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import {
  CARD_CLUSTER_RADIUS,
  CHART_TRACK_HEIGHT,
  DEBIT_CARD_ASPECT,
  TX_AVATAR_RADIUS,
  TX_AVATAR_SIZE,
  WITHDRAW_BTN_HEIGHT,
} from '@/lib/influencer/earnings';
import { StyleSheet, View } from 'react-native';

export function EarningsSkeleton() {
  return (
    <>
      <View style={styles.heroWrapper}>
        <View style={styles.heroCard}>
          <ShimmerCircle size={28} />
          <View style={styles.heroAmountRow}>
            <ShimmerText width="72%" height={44} />
          </View>
          <View style={styles.heroBottomRow}>
            <ShimmerText width="48%" height={14} />
            <ShimmerBlock width={48} height={28} radius={14} />
          </View>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.leftCol}>
          <GlassCard style={styles.statShell} contentStyle={styles.statInner}>
            <ShimmerText width="46%" height={13} />
            <ShimmerText width="82%" height={24} />
            <ShimmerText width="56%" height={11} />
          </GlassCard>
          <GlassCard style={styles.activityShell} contentStyle={styles.activityInner}>
            <ShimmerText width="62%" height={18} />
            <ShimmerBlock width="100%" height={CHART_TRACK_HEIGHT} radius={8} />
          </GlassCard>
        </View>
        <View style={styles.rightCol}>
          <GlassCard style={styles.withdrawShell} contentStyle={styles.withdrawInner}>
            <ShimmerBlock
              width="100%"
              height={WITHDRAW_BTN_HEIGHT}
              radius={WITHDRAW_BTN_HEIGHT / 2}
            />
          </GlassCard>
        </View>
      </View>

      <View style={styles.txSection}>
        <ShimmerText width="52%" height={22} />
        <GlassCard style={styles.txListShell} contentStyle={styles.txListInner}>
          {Array.from({ length: 4 }).map((_, index) => (
            <View key={index} style={styles.txRow}>
              <ShimmerBlock
                width={TX_AVATAR_SIZE}
                height={TX_AVATAR_SIZE}
                radius={TX_AVATAR_RADIUS}
              />
              <View style={styles.txBody}>
                <ShimmerText width="72%" height={16} />
                <ShimmerText width="45%" height={13} />
              </View>
              <ShimmerText width={68} height={18} />
              {index < 3 ? <View style={styles.txDivider} /> : null}
            </View>
          ))}
        </GlassCard>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  heroWrapper: {
    shadowColor: '#0D0D0D',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.42,
    shadowRadius: 28,
    elevation: 18,
  },
  heroCard: {
    width: '100%',
    aspectRatio: DEBIT_CARD_ASPECT,
    flexDirection: 'column',
    borderRadius: 24,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroAmountRow: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
  },
  leftCol: {
    width: '50%',
    paddingRight: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  rightCol: {
    width: '50%',
    paddingLeft: theme.spacing.sm,
    flexDirection: 'column',
  },
  statShell: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: CARD_CLUSTER_RADIUS,
  },
  statInner: {
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
  },
  activityShell: {
    width: '100%',
    alignSelf: 'stretch',
    flex: 1,
    minHeight: 128,
    borderRadius: CARD_CLUSTER_RADIUS,
  },
  activityInner: {
    flex: 1,
    minHeight: 0,
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },
  withdrawShell: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    borderRadius: CARD_CLUSTER_RADIUS,
  },
  withdrawInner: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  txSection: {
    gap: theme.spacing.lg,
  },
  txListShell: {
    width: '100%',
    borderRadius: 38,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  txListInner: {
    paddingVertical: theme.spacing.sm,
  },
  txRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 76,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  txBody: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  txDivider: {
    position: 'absolute',
    left: theme.spacing.xl + TX_AVATAR_SIZE + theme.spacing.md,
    right: theme.spacing.xl,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
});
