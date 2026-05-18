import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { theme } from '@/constants/theme';

type ShimmerBlockProps = {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

const BASE_COLOR = 'rgba(255,255,255,0.075)';
const MID_COLOR = 'rgba(255,255,255,0.18)';
const EDGE_COLOR = 'rgba(231,106,146,0.12)';

function useReduceMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      sub.remove();
    };
  }, []);

  return reduced;
}

export function ShimmerBlock({
  width = '100%',
  height,
  radius = Math.min(height / 2, theme.radius.card),
  style,
}: ShimmerBlockProps) {
  const translate = useRef(new Animated.Value(-1)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      translate.stopAnimation();
      translate.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(translate, {
        toValue: 1,
        duration: 1450,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      translate.setValue(-1);
    };
  }, [reduceMotion, translate]);

  const translateX = translate.interpolate({
    inputRange: [-1, 1],
    outputRange: [-180, 180],
  });

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.shell, { width, height, borderRadius: radius }, style]}
    >
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={<View style={[styles.mask, { borderRadius: radius }]} />}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: BASE_COLOR }]} />
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <LinearGradient
            colors={[BASE_COLOR, EDGE_COLOR, MID_COLOR, EDGE_COLOR, BASE_COLOR]}
            locations={[0, 0.28, 0.5, 0.72, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.band}
          />
        </Animated.View>
      </MaskedView>
    </View>
  );
}

export function ShimmerText({
  width = '70%',
  height = 16,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <ShimmerBlock width={width} height={height} radius={height / 2} style={style} />;
}

export function ShimmerCircle({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  return <ShimmerBlock width={size} height={size} radius={size / 2} style={style} />;
}

export function AsyncText({
  loading,
  value,
  fallback,
  shimmerWidth = '65%',
  shimmerHeight,
  style,
  numberOfLines,
  selectable,
}: {
  loading: boolean;
  value?: string | number | null;
  fallback?: string;
  shimmerWidth?: number | `${number}%`;
  shimmerHeight?: number;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  selectable?: boolean;
}) {
  if (loading) {
    return (
      <ShimmerText width={shimmerWidth} height={shimmerHeight ?? 18} style={styles.inlineShimmer} />
    );
  }

  const resolved = value == null || value === '' ? fallback : String(value);
  if (!resolved) return null;

  return (
    <Text selectable={selectable} style={style} numberOfLines={numberOfLines}>
      {resolved}
    </Text>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    backgroundColor: BASE_COLOR,
  },
  mask: {
    flex: 1,
    backgroundColor: '#000000',
  },
  band: {
    width: '220%',
    height: '100%',
  },
  inlineShimmer: {
    alignSelf: 'flex-start',
  },
});
