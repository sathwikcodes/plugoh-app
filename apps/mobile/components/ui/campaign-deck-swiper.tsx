import { CAMPAIGN_CARD_CORNER_RADIUS } from '@/constants/campaign-card-frame';
import { theme } from '@/constants/theme';
import type { CampaignListItem } from '@plugoh/contracts';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CampaignEmptyState } from './campaign-empty-state';
import { CampaignSwipeCard } from './campaign-swipe-card';

const SWIPE_THRESHOLD = 60;
const FLYOUT_DISTANCE = 500;
/** Snappy return when swipe is cancelled (does not cross threshold). */
const SNAP_BACK_SPRING = { damping: 18, stiffness: 380 };
/**
 * Short fly-out after release — spring was slow so `advance()` felt delayed.
 * Prev is slightly faster so the prior card snaps in sooner.
 */
const FLY_OUT_MS_NEXT = 130;
const FLY_OUT_MS_PREV = 85;
const flyOutEasing = Easing.out(Easing.cubic);

type Props = {
  campaigns: CampaignListItem[];
  isLoading: boolean;
  onRefresh: () => Promise<unknown>;
};

function BackCard({
  campaign,
  scale,
  opacity,
}: {
  campaign: CampaignListItem;
  scale: number;
  opacity: number;
}) {
  return (
    <View
      style={{ position: 'absolute', inset: 0, transform: [{ scale }], opacity }}
      pointerEvents="none"
    >
      <CampaignSwipeCard campaign={campaign} />
      <View
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: CAMPAIGN_CARD_CORNER_RADIUS,
          backgroundColor: 'rgba(0,0,0,0.08)',
        }}
        pointerEvents="none"
      />
    </View>
  );
}

export function CampaignDeckSwiper({ campaigns, isLoading, onRefresh }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const translateX = useSharedValue(0);
  const hasTriggeredHaptic = useSharedValue(false);

  const topCard = campaigns.at(currentIndex);
  const nextCard = campaigns.at(currentIndex + 1);
  const thirdCard = campaigns.at(currentIndex + 2);
  const prevCard = currentIndex > 0 ? campaigns.at(currentIndex - 1) : undefined;

  /** Under the top card: show next when idle / swiping left; crossfade to prev when swiping right. */
  const nextUnderlayStyle = useAnimatedStyle(() => ({
    opacity: 0.72 * interpolate(translateX.value, [-80, 0, 48], [1, 1, 0], Extrapolate.CLAMP),
  }));

  const prevUnderlayStyle = useAnimatedStyle(() => ({
    opacity: 0.78 * interpolate(translateX.value, [-48, 0, 80], [0, 0, 1], Extrapolate.CLAMP),
  }));

  function fireHapticLight() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function fireHapticMedium() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function advance(direction: 'next' | 'prev') {
    setCurrentIndex((i) => (direction === 'next' ? i + 1 : i - 1));
  }

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;

      const inDecisionZone = Math.abs(e.translationX) > SWIPE_THRESHOLD;
      if (inDecisionZone && !hasTriggeredHaptic.value) {
        hasTriggeredHaptic.value = true;
        runOnJS(fireHapticLight)();
      } else if (!inDecisionZone) {
        hasTriggeredHaptic.value = false;
      }
    })
    .onEnd((e) => {
      if (!topCard) return;

      const isRightSwipe = e.translationX > SWIPE_THRESHOLD;
      const isLeftSwipe = e.translationX < -SWIPE_THRESHOLD;
      const canGoBack = currentIndex > 0;
      const canGoNext = currentIndex < campaigns.length - 1;

      if (isRightSwipe && canGoBack) {
        runOnJS(fireHapticMedium)();
        translateX.value = withTiming(
          FLYOUT_DISTANCE,
          { duration: FLY_OUT_MS_PREV, easing: flyOutEasing },
          (finished) => {
            if (!finished) return;
            runOnJS(advance)('prev');
            translateX.value = 0;
            hasTriggeredHaptic.value = false;
          },
        );
      } else if (isLeftSwipe && canGoNext) {
        runOnJS(fireHapticMedium)();
        translateX.value = withTiming(
          -FLYOUT_DISTANCE,
          { duration: FLY_OUT_MS_NEXT, easing: flyOutEasing },
          (finished) => {
            if (!finished) return;
            runOnJS(advance)('next');
            translateX.value = 0;
            hasTriggeredHaptic.value = false;
          },
        );
      } else {
        translateX.value = withSpring(0, SNAP_BACK_SPRING);
        hasTriggeredHaptic.value = false;
      }
    });

  const topCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${interpolate(translateX.value, [-200, 200], [-15, 15], 'clamp')}deg` },
    ],
  }));

  async function handleRefresh() {
    setRefreshing(true);
    setCurrentIndex(0);
    await onRefresh();
    setRefreshing(false);
  }

  if (isLoading && campaigns.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.muted} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flex: 1 }}
      scrollEnabled={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.muted}
        />
      }
    >
      <View style={{ flex: 1, position: 'relative' }}>
        {thirdCard && <BackCard campaign={thirdCard} scale={0.85} opacity={0.4} />}

        {nextCard ? (
          <Animated.View
            style={[
              { position: 'absolute', inset: 0, transform: [{ scale: 0.92 }] },
              nextUnderlayStyle,
            ]}
            pointerEvents="none"
          >
            <CampaignSwipeCard campaign={nextCard} />
            <View
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: CAMPAIGN_CARD_CORNER_RADIUS,
                backgroundColor: 'rgba(0,0,0,0.08)',
              }}
              pointerEvents="none"
            />
          </Animated.View>
        ) : null}

        {prevCard ? (
          <Animated.View
            style={[
              { position: 'absolute', inset: 0, transform: [{ scale: 0.92 }] },
              prevUnderlayStyle,
            ]}
            pointerEvents="none"
          >
            <CampaignSwipeCard campaign={prevCard} />
            <View
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: CAMPAIGN_CARD_CORNER_RADIUS,
                backgroundColor: 'rgba(0,0,0,0.08)',
              }}
              pointerEvents="none"
            />
          </Animated.View>
        ) : null}

        {topCard ? (
          <GestureDetector gesture={gesture}>
            <Animated.View style={[{ position: 'absolute', inset: 0 }, topCardStyle]}>
              <CampaignSwipeCard campaign={topCard} />
            </Animated.View>
          </GestureDetector>
        ) : (
          <CampaignEmptyState />
        )}

        {/* Keep full card height aligned with GlassPlaceholderCard; counter overlays bottom */}
        {campaigns.length > 1 && topCard ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: theme.spacing.md,
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>
              {currentIndex + 1} / {campaigns.length}
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
