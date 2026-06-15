import { PremiumGlassCanvas } from '@/components/ui/premium-glass-canvas';
import { getActiveBackgroundPalette, type BackgroundPalette } from '@/constants/background-palette';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  blurIntensity?: number;
};

export function LiquidModalBackdrop() {
  const palette = getActiveBackgroundPalette();

  return (
    <>
      <BlurView
        tint="systemUltraThinMaterial"
        intensity={Platform.OS === 'android' ? 16 : 26}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[styles.backdropVeil, { backgroundColor: hexToRgba(palette.deep, 0.42) }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          hexToRgba(palette.base, 0.24),
          hexToRgba(palette.glossWarm?.color ?? palette.gloss.color, 0.12),
        ]}
        locations={[0, 1]}
        style={StyleSheet.absoluteFill}
      />
    </>
  );
}

export function LiquidSheetSurface({ children, style, blurIntensity = 94 }: Props) {
  const palette = getActiveBackgroundPalette();
  const surfaceStyle = [styles.surface, style, { backgroundColor: palette.base }];

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="dark" style={surfaceStyle}>
        <LiquidSurfaceBackground palette={palette} />
        <LiquidSurfaceOverlays palette={palette} />
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView tint="systemUltraThinMaterialDark" intensity={blurIntensity} style={surfaceStyle}>
      <LiquidSurfaceBackground palette={palette} />
      <LiquidSurfaceOverlays palette={palette} />
      {children}
    </BlurView>
  );
}

function LiquidSurfaceBackground({ palette }: { palette: BackgroundPalette }) {
  if (palette.useRadialCanvas) {
    return <PremiumGlassCanvas />;
  }

  return (
    <LinearGradient
      colors={[...palette.gradient]}
      locations={[...palette.gradientLocations]}
      start={palette.gradientStart}
      end={palette.gradientEnd}
      style={StyleSheet.absoluteFill}
    />
  );
}

function LiquidSurfaceOverlays({ palette }: { palette: BackgroundPalette }) {
  const warmBottomColor = palette.glossWarm?.color ?? palette.gloss.color;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.baseVeil, { backgroundColor: hexToRgba(palette.base, 0.24) }]} />
      <LinearGradient
        colors={[
          hexToRgba(palette.gloss.color, 0.2),
          hexToRgba(palette.gloss.color, 0.07),
          hexToRgba(palette.gloss.color, 0),
        ]}
        locations={[0, 0.34, 1]}
        style={styles.topSheen}
      />
      <LinearGradient
        colors={[hexToRgba(warmBottomColor, 0), hexToRgba(warmBottomColor, 0.1)]}
        locations={[0, 1]}
        style={styles.warmBottom}
      />
      <View style={styles.innerRim} />
    </View>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;
  const parsed = Number.parseInt(value, 16);
  const red = (parsed >> 16) & 255;
  const green = (parsed >> 8) & 255;
  const blue = parsed & 255;

  return `rgba(${red},${green},${blue},${alpha})`;
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
  },
  baseVeil: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropVeil: {
    ...StyleSheet.absoluteFillObject,
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 170,
  },
  warmBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 180,
  },
  innerRim: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
});
