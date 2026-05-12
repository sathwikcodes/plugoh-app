import { theme } from '@/constants/theme';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function CampaignEmptyState() {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 300 });
    textOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xl,
        paddingHorizontal: theme.spacing.section,
      }}
    >
      <Animated.View style={circleStyle}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.colors.successSoft,
            borderWidth: 2,
            borderColor: theme.colors.success,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Checkmark drawn with views */}
          <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                position: 'absolute',
                width: 2,
                height: 14,
                backgroundColor: theme.colors.success,
                borderRadius: 1,
                bottom: 6,
                left: 8,
                transform: [{ rotate: '45deg' }, { translateY: -2 }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: 2,
                height: 22,
                backgroundColor: theme.colors.success,
                borderRadius: 1,
                bottom: 6,
                right: 8,
                transform: [{ rotate: '-45deg' }, { translateY: -5 }],
              }}
            />
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[textStyle, { alignItems: 'center', gap: theme.spacing.sm }]}>
        <Text
          style={{
            ...theme.typography.section,
            color: theme.colors.foreground,
            textAlign: 'center',
          }}
        >
          You're all caught up!
        </Text>
        <Text
          style={{
            ...theme.typography.body,
            color: theme.colors.muted,
            textAlign: 'center',
          }}
        >
          No new campaign requests right now.{'\n'}Pull down to check for updates.
        </Text>
      </Animated.View>
    </View>
  );
}
