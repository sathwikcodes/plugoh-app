import {
  ACTIVE_BACKGROUND_PALETTE_ID,
  getActiveBackgroundPalette,
  type BackgroundBloom,
  type BackgroundMesh,
  type BackgroundPalette,
} from '@/constants/background-palette';
import { blendHex } from '@/constants/premium-mesh-gradient';
import { LinearGradient } from 'expo-linear-gradient';
import { MeshGradientView } from 'expo-mesh-gradient';
import { memo, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PremiumGlassCanvas } from '@/components/ui/premium-glass-canvas';

type AppBackgroundProps = {
  /** Override active palette (used by previews / Storybook). */
  palette?: BackgroundPalette;
  style?: StyleProp<ViewStyle>;
};

function bloomPosition(bloom: BackgroundBloom): ViewStyle {
  return {
    top: bloom.top,
    left: bloom.left,
    right: bloom.right,
    bottom: bloom.bottom,
  };
}

/** Two-layer bloom: outer feather + inner core for soft, soothing glow (not a hard orb). */
function SoftBloom({ bloom }: { bloom: BackgroundBloom }) {
  const outerSize = bloom.size * 1.45;
  const coreSize = bloom.size * 0.72;

  return (
    <>
      <View
        pointerEvents="none"
        style={[
          styles.bloom,
          bloomPosition(bloom),
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            backgroundColor: bloom.color,
            opacity: bloom.opacity * 0.38,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.bloom,
          bloomPosition(bloom),
          {
            width: coreSize,
            height: coreSize,
            borderRadius: coreSize / 2,
            backgroundColor: bloom.color,
            opacity: bloom.opacity,
          },
        ]}
      />
    </>
  );
}

/**
 * Single soft warm-white catch-light at the top-left — simulates one light source
 * grazing a glossy glass surface. Feathered (two-circle SoftBloom), low opacity.
 */
const SPECULAR_HIGHLIGHT: BackgroundBloom = {
  color: '#FFF6F0',
  opacity: 0.14,
  size: 360,
  top: -120,
  left: -90,
};

function getOpaqueMeshColors(mesh: BackgroundMesh, baseHex: string): string[] {
  return mesh.colors.map((color, index) =>
    blendHex(baseHex, color, mesh.opacities?.[index] ?? mesh.opacity),
  );
}

function ScreenMeshGradient({
  baseHex,
  mesh,
}: {
  baseHex: string;
  mesh: NonNullable<BackgroundPalette['mesh']>;
}) {
  const colors = useMemo(() => getOpaqueMeshColors(mesh, baseHex), [baseHex, mesh]);

  return (
    <MeshGradientView
      style={StyleSheet.absoluteFillObject}
      columns={3}
      rows={3}
      points={mesh.points.map(([x, y]) => [x, y])}
      colors={colors}
      smoothsColors
    />
  );
}

export const AppBackground = memo(function AppBackground({ palette, style }: AppBackgroundProps) {
  const active = palette ?? getActiveBackgroundPalette();

  // Warm-glass palettes render a true SVG radial canvas (paints on any iOS version)
  // instead of the gradient/mesh/bloom/overlay stack below.
  if (active.useRadialCanvas) {
    return (
      <View pointerEvents="none" style={[styles.root, style, { backgroundColor: active.deep }]}>
        <PremiumGlassCanvas />
      </View>
    );
  }

  const {
    blooms,
    calmCenter,
    gloss,
    glossWarm,
    gradient,
    gradientLocations,
    gradientStart,
    gradientEnd,
    heroLift,
    mesh,
  } = active;

  return (
    <View pointerEvents="none" style={[styles.root, style, { backgroundColor: active.deep }]}>
      <LinearGradient
        colors={[...gradient]}
        locations={[...gradientLocations]}
        start={gradientStart}
        end={gradientEnd}
        style={StyleSheet.absoluteFill}
      />

      {mesh ? (
        <>
          <ScreenMeshGradient baseHex={active.base} mesh={mesh} />
          <SoftBloom bloom={SPECULAR_HIGHLIGHT} />
        </>
      ) : (
        <>
          <SoftBloom bloom={blooms.pink} />
          <SoftBloom bloom={blooms.gold} />
          <SoftBloom bloom={blooms.accent} />
        </>
      )}

      {calmCenter ? (
        <LinearGradient
          colors={[
            blendHex(active.base, calmCenter.color, calmCenter.opacity * 1.65),
            blendHex(active.base, calmCenter.color, calmCenter.opacity * 0.2),
            active.base,
          ]}
          locations={[0, 0.28, 0.62]}
          start={{ x: 0.42, y: 0 }}
          end={{ x: 0.42, y: 0.58 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}

      {heroLift ? (
        <LinearGradient
          colors={[blendHex(active.base, heroLift.color, heroLift.opacity), active.base]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.heroLift, { height: `${(heroLift.height ?? 0.4) * 100}%` }]}
          pointerEvents="none"
        />
      ) : null}

      <LinearGradient
        colors={[blendHex(active.base, gloss.color, gloss.opacity), active.base]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.45 }}
        style={styles.gloss}
        pointerEvents="none"
      />

      {glossWarm ? (
        <LinearGradient
          colors={[active.base, blendHex(active.base, glossWarm.color, glossWarm.opacity)]}
          start={{ x: 0.5, y: 0.55 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glossWarm}
          pointerEvents="none"
        />
      ) : null}
    </View>
  );
});

/** Re-export for dev tools / previews that need the active id without importing palette module twice. */
export { ACTIVE_BACKGROUND_PALETTE_ID };

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bloom: {
    position: 'absolute',
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
  },
  heroLift: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  glossWarm: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '38%',
  },
});
