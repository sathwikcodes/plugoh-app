import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
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
    outputRange: ['#A8A8A8', '#000000'],
  });

  return (
    <Animated.View style={[styles.button, style, { backgroundColor }]}>
      <Pressable style={styles.pressable} onPress={onPress} disabled={!active || loading}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.label}>{label}</Text>
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
    color: '#FFFFFF',
    fontSize: 17,
  },
});
