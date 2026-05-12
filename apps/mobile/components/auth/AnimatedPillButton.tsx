import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { authTypography } from '@/components/auth/typography';

type Props = {
  label: string;
  onPress: () => void;
  active: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function AnimatedPillButton({ label, onPress, active, loading = false, style }: Props) {
  const animatedValue = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: active ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [active, animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#2D2D2D', '#FFFFFF'],
  });

  const textColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#555555', '#0D0D0D'],
  });

  return (
    <Animated.View style={[styles.button, style, { backgroundColor }]}>
      <Pressable style={styles.pressable} onPress={onPress} disabled={!active || loading}>
        {loading ? (
          <ActivityIndicator color="#0D0D0D" />
        ) : (
          <Animated.Text style={[styles.label, { color: textColor }]}>{label}</Animated.Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...authTypography.bodyStrong,
    fontSize: 17,
  },
});
