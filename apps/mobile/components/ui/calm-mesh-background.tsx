import { theme } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { MeshGradientView } from 'expo-mesh-gradient';
import { StyleSheet } from 'react-native';

const BASE = theme.colors.background;

/** 4×4 mesh: row-major (left→right, top→bottom). Mostly deep base with soft pink/gold washes. */
const MESH_COLORS = [
  BASE,
  'rgba(255, 60, 172, 0.1)',
  '#0a0a12',
  'rgba(255, 215, 0, 0.08)',
  '#0d0d16',
  'rgba(255, 60, 172, 0.16)',
  '#12121c',
  'rgba(255, 215, 0, 0.12)',
  '#08080f',
  'rgba(255, 60, 172, 0.12)',
  BASE,
  'rgba(255, 215, 0, 0.09)',
  '#0a0a12',
  'rgba(255, 60, 172, 0.14)',
  '#101018',
  'rgba(255, 215, 0, 0.1)',
] as const;

/** Slightly irregular grid for an organic mesh (normalized 0–1). */
const MESH_POINTS: number[][] = [
  [0.0, 0.0],
  [0.36, 0.02],
  [0.66, 0.0],
  [1.0, 0.04],
  [0.02, 0.32],
  [0.38, 0.34],
  [0.64, 0.3],
  [0.98, 0.36],
  [0.0, 0.66],
  [0.34, 0.64],
  [0.68, 0.68],
  [1.0, 0.62],
  [0.04, 1.0],
  [0.36, 0.96],
  [0.62, 1.0],
  [0.96, 0.98],
];

function WebMeshFallback() {
  return (
    <LinearGradient
      colors={[BASE, 'rgba(255, 60, 172, 0.08)', 'rgba(255, 215, 0, 0.06)', BASE]}
      locations={[0, 0.38, 0.62, 1]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    />
  );
}

/**
 * Decorative full-bleed background for influencer home: calm mesh on native,
 * subtle linear gradient on web (mesh is not supported there).
 */
export function CalmMeshBackground() {
  if (process.env.EXPO_OS === 'web') {
    return <WebMeshFallback />;
  }

  return (
    <MeshGradientView
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      columns={4}
      rows={4}
      colors={[...MESH_COLORS]}
      points={MESH_POINTS}
      smoothsColors
      {...(process.env.EXPO_OS === 'android' ? { resolution: { x: 2, y: 2 } } : {})}
    />
  );
}
