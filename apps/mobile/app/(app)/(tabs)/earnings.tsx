import { EarningsHeroCard } from '@/components/earnings/earnings-hero-card';
import { EarningsSkeleton } from '@/components/earnings/earnings-skeleton';
import { MonthlyActivityCard } from '@/components/earnings/monthly-activity-card';
import { RecentTransactionsSection } from '@/components/earnings/recent-transactions-section';
import { TotalEarnedCard } from '@/components/earnings/total-earned-card';
import { EarningsWithdrawColumn } from '@/components/earnings/withdraw-card';
import { AppHeader, APP_HEADER_SCREEN_TOP_PADDING } from '@/components/ui/app-header';
import { ErrorState, Screen } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useBootstrap, useEarnings, useInfluencerProfile } from '@/hooks/use-marketplace';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const influencerProfile = useInfluencerProfile();
  const bootstrap = useBootstrap();
  const earnings = useEarnings();
  const bootstrapLoading = shouldShowInitialLoader(bootstrap);
  const earningsLoading = bootstrapLoading || shouldShowInitialLoader(earnings);
  const profileLoading = bootstrapLoading || shouldShowInitialLoader(influencerProfile);
  const displayName =
    influencerProfile.data?.display_name ?? influencerProfile.data?.ig_username ?? 'Influencer';

  const onWithdraw = useCallback(() => {
    // Withdrawal flow TBD — hook bank / payout here.
  }, []);

  return (
    <Screen
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{
        paddingTop: Math.max(
          insets.top + APP_HEADER_SCREEN_TOP_PADDING - theme.spacing.hero,
          theme.spacing.sm,
        ),
      }}
    >
      <AppHeader
        title="Earnings"
        profile={{
          imageUri: influencerProfile.data?.profile_photo_url,
          onPress: () => {
            router.push('/(app)/profile');
          },
        }}
      />

      {earningsLoading ? (
        <View style={styles.body}>
          <EarningsSkeleton />
        </View>
      ) : earnings.isError ? (
        <View style={styles.body}>
          <ErrorState
            title="Couldn't load earnings"
            subtitle="Check your connection and try again"
            onRetry={() => void earnings.refetch()}
          />
        </View>
      ) : earnings.data ? (
        <View style={styles.body}>
          <Animated.View entering={FadeInDown.delay(0).duration(500)}>
            <EarningsHeroCard
              data={earnings.data}
              displayName={profileLoading ? 'Influencer' : displayName}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.grid}>
            <View style={styles.leftCol}>
              <TotalEarnedCard data={earnings.data} />
              <MonthlyActivityCard data={earnings.data} />
            </View>
            <View style={styles.rightCol}>
              <EarningsWithdrawColumn onPress={onWithdraw} />
            </View>
          </Animated.View>

          <RecentTransactionsSection transactions={earnings.data.transactions} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
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
});
