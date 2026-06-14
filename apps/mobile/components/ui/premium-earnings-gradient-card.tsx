import {
  PREMIUM_EARNINGS_MESH_COLORS,
  PREMIUM_EARNINGS_MESH_POINTS,
  PREMIUM_EARNINGS_SHELL_FALLBACK,
} from '@/constants/premium-mesh-gradient';
import { MeshGradientView } from 'expo-mesh-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

export type PremiumEarningsGradientCardProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export function PremiumEarningsGradientCard({ children, style }: PremiumEarningsGradientCardProps) {
  return (
    <View style={[styles.shell, style]}>
      <View pointerEvents="none" style={styles.innerClip}>
        <MeshGradientView
          style={StyleSheet.absoluteFillObject}
          columns={3}
          rows={3}
          points={PREMIUM_EARNINGS_MESH_POINTS.map(([x, y]) => [x, y])}
          colors={[...PREMIUM_EARNINGS_MESH_COLORS]}
          smoothsColors
        />
        {/* edge-only bevel — no full-surface film, so the colour stays rich */}
        <View style={styles.innerStroke} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    backgroundColor: PREMIUM_EARNINGS_SHELL_FALLBACK,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    boxShadow:
      '0 26px 40px rgba(38,18,48,0.42), 0 10px 18px rgba(70,36,8,0.22), inset 0 1px 0 rgba(255,255,255,0.16)',
  },
  innerClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  // Beveled metal edge: bright catch-light along the top, a warm shadow under
  // the bottom lip, and a soft inner vignette to give the surface real weight.
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderCurve: 'continuous',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.18), inset 0 -2px 3px rgba(120,68,12,0.3)',
  },
});
