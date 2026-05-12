import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { authTypography } from '@/components/auth/typography';

const OUTER_RADIUS = 122;
const CENTER = 150;
const ITEM_SIZE = 56;
const ITEM_HALF = ITEM_SIZE / 2;

const orbitItems = [
  { angle: 0, type: 'avatar', label: 'A', bg: '#1E1530' },
  { angle: 60, type: 'icon', icon: 'calendar', bg: '#0F1E2E' },
  { angle: 120, type: 'avatar', label: 'K', bg: '#1E1E1E' },
  { angle: 180, type: 'icon', icon: 'star', bg: '#2A0F1A' },
  { angle: 240, type: 'avatar', label: 'R', bg: '#0F2018' },
  { angle: 300, type: 'icon', icon: 'musical-notes', bg: '#25180A' },
] as const;

function OrbitItem({ item, index }: { item: (typeof orbitItems)[number]; index: number }) {
  const radians = (item.angle * Math.PI) / 180;
  const x = CENTER + OUTER_RADIUS * Math.cos(radians) - ITEM_HALF;
  const y = CENTER + OUTER_RADIUS * Math.sin(radians) - ITEM_HALF;

  return (
    <Animated.View
      entering={FadeIn.delay(120 * index).duration(450)}
      style={[styles.outerItem, { left: x, top: y }]}
    >
      <View style={[styles.outerItemInner, { backgroundColor: item.bg }]}>
        {item.type === 'icon' ? (
          <Ionicons name={item.icon} size={26} color="#F2EDE8" />
        ) : (
          <Text style={styles.avatarText}>{item.label}</Text>
        )}
      </View>
    </Animated.View>
  );
}

export function OrbitalComposition() {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withRepeat(
      withTiming(10, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [offset]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return (
    <Animated.View style={[styles.wrapper, floatStyle]}>
      <View style={styles.ringLarge} />
      <View style={styles.ringSmall} />

      {orbitItems.map((item, index) => (
        <View key={item.angle}>
          <View
            style={[
              styles.connectionLine,
              {
                left:
                  CENTER +
                  ((OUTER_RADIUS - 18) / 2) * Math.cos((item.angle * Math.PI) / 180) -
                  (OUTER_RADIUS - 18) / 2,
                top: CENTER + ((OUTER_RADIUS - 18) / 2) * Math.sin((item.angle * Math.PI) / 180),
                transform: [{ rotateZ: `${item.angle}deg` }],
              },
            ]}
          />
          <OrbitItem item={item} index={index} />
        </View>
      ))}

      <Animated.View entering={FadeIn.delay(220).duration(500)} style={styles.centerDiamondWrapper}>
        <LinearGradient
          colors={['#FFD700', '#FF7A00', '#E84B8A', '#00C4CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.centerDiamond}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 300,
    height: 300,
    alignSelf: 'center',
    position: 'relative',
    marginTop: 32,
  },
  ringLarge: {
    position: 'absolute',
    left: 18,
    top: 18,
    width: 264,
    height: 264,
    borderRadius: 132,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ringSmall: {
    position: 'absolute',
    left: 70,
    top: 70,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  connectionLine: {
    position: 'absolute',
    width: OUTER_RADIUS - 18,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  centerDiamondWrapper: {
    position: 'absolute',
    left: CENTER - 30,
    top: CENTER - 30,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDiamond: {
    width: 60,
    height: 60,
    borderRadius: 14,
    transform: [{ rotate: '45deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  outerItem: {
    position: 'absolute',
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_HALF,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  outerItemInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...authTypography.bodyStrong,
    fontSize: 18,
    color: '#F2EDE8',
  },
});
