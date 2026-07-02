import Ionicons from '@expo/vector-icons/Ionicons';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '@/constants/theme';

const TRACK_HEIGHT = 68;
const TRACK_PADDING = 6;
const THUMB_SIZE = TRACK_HEIGHT - TRACK_PADDING * 2;
const DRAG_THRESHOLD = 0.86;
const SPRING_CONFIG = {
  damping: 24,
  mass: 0.72,
  stiffness: 260,
};

type SlideToPayButtonProps = {
  label?: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onComplete: () => void;
  style?: StyleProp<ViewStyle>;
};

export function SlideToPayButton({
  label = 'Slide to continue payment',
  loadingLabel = 'Opening payment...',
  loading = false,
  disabled = false,
  onComplete,
  style,
}: SlideToPayButtonProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const completed = useSharedValue(false);
  const maxTravel = Math.max(trackWidth - THUMB_SIZE - TRACK_PADDING * 2, 0);
  const isLocked = disabled || loading;

  const completePayment = useCallback(() => {
    if (Platform.OS === 'ios') {
      void impactAsync(ImpactFeedbackStyle.Medium);
    }
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!loading) {
      completed.value = false;
      translateX.value = withSpring(0, SPRING_CONFIG);
    }
  }, [completed, loading, translateX]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!isLocked && maxTravel > 0)
        .activeOffsetX([-8, 8])
        .failOffsetY([-18, 18])
        .hitSlop({ left: 10, right: 10, top: 8, bottom: 8 })
        .onBegin(() => {
          startX.value = translateX.value;
        })
        .onUpdate((event) => {
          if (completed.value) return;
          const next = Math.min(Math.max(startX.value + event.translationX, 0), maxTravel);
          translateX.value = next;
        })
        .onEnd(() => {
          if (completed.value) return;
          const shouldComplete = maxTravel > 0 && translateX.value >= maxTravel * DRAG_THRESHOLD;

          if (shouldComplete) {
            completed.value = true;
            translateX.value = withSpring(maxTravel, SPRING_CONFIG);
            runOnJS(completePayment)();
            return;
          }

          translateX.value = withSpring(0, SPRING_CONFIG);
        }),
    [completePayment, completed, isLocked, maxTravel, startX, translateX],
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  const handleAccessibilityComplete = useCallback(() => {
    if (isLocked) return;
    completePayment();
  }, [completePayment, isLocked]);

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value,
  }));

  const thumbStyle = useAnimatedStyle(() => {
    const progress = maxTravel <= 0 ? 0 : translateX.value / maxTravel;

    return {
      transform: [
        { translateX: translateX.value },
        {
          scale: interpolate(progress, [0, 0.65, 1], [1, 1.045, 1.025], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const labelStyle = useAnimatedStyle(() => ({
    opacity: loading
      ? withTiming(1, { duration: 160 })
      : interpolate(translateX.value, [0, maxTravel * 0.72], [1, 0.3], Extrapolation.CLAMP),
    transform: [
      {
        translateX: interpolate(translateX.value, [0, maxTravel], [0, 10], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityActions={[{ name: 'activate', label: 'Continue payment' }]}
        accessibilityHint="Drag the handle to the end to continue payment."
        accessibilityLabel={loading ? loadingLabel : label}
        accessibilityRole="button"
        accessibilityState={{ busy: loading, disabled: isLocked }}
        onAccessibilityAction={handleAccessibilityComplete}
        onAccessibilityTap={handleAccessibilityComplete}
        onLayout={handleLayout}
        style={[styles.track, isLocked ? styles.trackLocked : null, style]}
      >
        <Animated.View style={[styles.gradientFill, fillStyle]}>
          <LinearGradient
            colors={['#833AB4', '#E1306C', '#FD1D1D', '#FCAF45']}
            locations={[0, 0.42, 0.72, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={styles.innerShadow} pointerEvents="none" />
        <Animated.Text style={[styles.label, labelStyle]} numberOfLines={1}>
          {loading ? loadingLabel : label}
        </Animated.Text>

        <Animated.View style={[styles.thumb, thumbStyle]}>
          <LinearGradient
            colors={['#FFFFFF', '#F6F4EE', '#DED8CC']}
            locations={[0, 0.58, 1]}
            start={{ x: 0.28, y: 0 }}
            end={{ x: 0.76, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {loading ? (
            <ActivityIndicator color="#090909" size="small" />
          ) : (
            <Ionicons name="arrow-forward" size={25} color="#090909" />
          )}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    minHeight: TRACK_HEIGHT,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: TRACK_PADDING,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: theme.radius.pill,
    backgroundColor: '#020202',
    boxShadow:
      '0 18px 34px rgba(0,0,0,0.45), inset 0 2px 2px rgba(255,255,255,0.12), inset 0 -12px 18px rgba(0,0,0,0.72)',
  },
  trackLocked: {
    opacity: 0.56,
  },
  gradientFill: {
    position: 'absolute',
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    left: TRACK_PADDING,
    overflow: 'hidden',
    borderRadius: theme.radius.pill,
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.38), inset 0 -8px 12px rgba(55,0,46,0.38)',
  },
  innerShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.radius.pill,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 0 rgba(255,255,255,0.04)',
  },
  label: {
    ...theme.typography.bodyStrong,
    alignSelf: 'center',
    maxWidth: '72%',
    color: theme.colors.white,
    textAlign: 'center',
  },
  thumb: {
    position: 'absolute',
    left: TRACK_PADDING,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.88)',
    borderRadius: theme.radius.pill,
    backgroundColor: '#FFFFFF',
    boxShadow:
      '0 10px 18px rgba(0,0,0,0.52), 0 2px 4px rgba(0,0,0,0.42), inset 0 1px 1px rgba(255,255,255,0.95), inset 0 -8px 12px rgba(88,77,59,0.18)',
  },
});
