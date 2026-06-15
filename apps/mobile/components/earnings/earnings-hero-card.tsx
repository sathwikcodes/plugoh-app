import { PremiumEarningsGradientCard } from '@/components/ui/premium-earnings-gradient-card';
import { theme } from '@/constants/theme';
import { DEBIT_CARD_ASPECT, formatPaiseAmount } from '@/lib/influencer/earnings';
import appIcon from '@/assets/images/icon.png';
import coinImage from '@/assets/images/coin.png';
import shieldImage from '@/assets/images/shield.png';
import type { EarningsSummary } from '@plugoh/contracts';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

export function EarningsHeroCard({
  data,
  displayName,
}: {
  data: EarningsSummary;
  displayName: string;
}) {
  return (
    <View style={styles.wrapper}>
      <PremiumEarningsGradientCard style={styles.card}>
        <View style={styles.topRow}>
          <Image source={appIcon} style={styles.logo} contentFit="contain" />
        </View>

        <View style={styles.amountRow}>
          <Image
            source={coinImage}
            style={styles.amountCoin}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
            {formatPaiseAmount(data.total_earnings)}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.holderName} numberOfLines={1}>
            {displayName.toUpperCase()}
          </Text>
          <View
            style={styles.shieldWrap}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Image
              source={shieldImage}
              style={styles.shieldMark}
              contentFit="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
        </View>
      </PremiumEarningsGradientCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    shadowColor: '#0D0D0D',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.42,
    shadowRadius: 28,
    elevation: 18,
  },
  card: {
    width: '100%',
    aspectRatio: DEBIT_CARD_ASPECT,
    flexDirection: 'column',
    borderRadius: 24,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexShrink: 0,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    opacity: 0.64,
  },
  amountRow: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: theme.spacing.sm,
    paddingTop: 0,
  },
  amountCoin: {
    width: 40,
    height: 40,
    flexShrink: 0,
  },
  amount: {
    fontFamily: theme.typography.metric.fontFamily,
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 46,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    textAlign: 'left',
    flexShrink: 1,
    minWidth: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  holderName: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
    flex: 1,
    marginRight: theme.spacing.md,
  },
  shieldWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  shieldMark: {
    width: 36,
    height: 36,
  },
});
