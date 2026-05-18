import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

type SkiaModule = typeof import('@shopify/react-native-skia');

const NOISE_WIDTH = 1200;
const NOISE_HEIGHT = 760;

export type PremiumEarningsGradientCardProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export function PremiumEarningsGradientCard({ children, style }: PremiumEarningsGradientCardProps) {
  const skia = useOptionalSkia();

  return (
    <View style={[styles.shell, style]}>
      <View pointerEvents="none" style={styles.innerClip}>
        <LinearGradient
          colors={['#FF3CAC', '#FF3CAC', '#FFD700', '#FFD700']}
          locations={[0, 0.42, 0.68, 1]}
          start={{ x: 0.04, y: 0.12 }}
          end={{ x: 0.98, y: 0.78 }}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={[
            'rgba(255,60,172,0)',
            'rgba(255,60,172,0.2)',
            'rgba(255,215,0,0.32)',
            'rgba(255,215,0,0)',
          ]}
          locations={[0, 0.38, 0.62, 1]}
          start={{ x: 0.2, y: 1 }}
          end={{ x: 0.78, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={['rgba(255,215,0,0)', 'rgba(255,215,0,0.82)', '#FFD700']}
          locations={[0, 0.58, 1]}
          start={{ x: 0.42, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
        <BlurView intensity={24} tint="default" style={styles.topBlur} />
        <BlurView intensity={18} tint="default" style={styles.transitionBlur} />
        {skia ? <SkiaGrainLayer skia={skia} /> : <View style={styles.grainFallback} />}
        <View style={styles.innerStroke} />
      </View>
      {children}
    </View>
  );
}

function useOptionalSkia() {
  const [skia, setSkia] = useState<SkiaModule | null>(null);

  useEffect(() => {
    let mounted = true;

    void import('@shopify/react-native-skia')
      .then((module) => {
        if (mounted) setSkia(module);
      })
      .catch(() => {
        if (mounted) setSkia(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return skia;
}

function SkiaGrainLayer({ skia }: { skia: SkiaModule }) {
  const { Canvas, FractalNoise, Group, Rect, Turbulence } = skia;

  return (
    <Canvas style={[StyleSheet.absoluteFill, styles.grainCanvas]}>
      <Group opacity={0.24} blendMode="multiply">
        <Rect x={0} y={0} width={NOISE_WIDTH} height={NOISE_HEIGHT}>
          <Turbulence freqX={1.15} freqY={1.15} octaves={4} seed={12} />
        </Rect>
      </Group>
      <Group opacity={0.16} blendMode="multiply">
        <Rect x={0} y={0} width={NOISE_WIDTH} height={NOISE_HEIGHT}>
          <FractalNoise freqX={0.52} freqY={0.62} octaves={3} seed={31} />
        </Rect>
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    backgroundColor: '#FF3CAC',
    borderCurve: 'continuous',
    boxShadow: '0 18px 30px rgba(0,0,0,0.34), 0 1px 2px rgba(255,215,0,0.2)',
  },
  innerClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  topBlur: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: '42%',
    opacity: 0.28,
  },
  transitionBlur: {
    position: 'absolute',
    top: '-18%',
    bottom: '-18%',
    left: '28%',
    width: '44%',
    opacity: 0.24,
    transform: [{ rotate: '13deg' }],
  },
  grainCanvas: {
    opacity: 1,
  },
  grainFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.22)',
    boxShadow: 'inset 0 1px 1px rgba(255,215,0,0.16), inset 0 -18px 24px rgba(0,0,0,0.12)',
  },
});
