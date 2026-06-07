import { MeshGradientView } from 'expo-mesh-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

export type PremiumEarningsGradientCardProps = {
  children: ReactNode;
  style?: ViewStyle;
};

// 3×3 control mesh. Purple drifts out of the top-left, warm gold pools in the
// bottom-right, and a cream bloom blends through the centre — the diffuse
// "liquid metal" flow Apple uses on the Wallet card. The middle vertex is
// nudged up-and-right so the blend reads organic rather than a straight wash.
const MESH_POINTS = [
  [0.0, 0.0],
  [0.5, 0.0],
  [1.0, 0.0],
  [0.0, 0.5],
  [0.62, 0.4],
  [1.0, 0.5],
  [0.0, 1.0],
  [0.5, 1.0],
  [1.0, 1.0],
];

const MESH_COLORS = [
  '#9B1FFF',
  '#E04BFF',
  '#FFD24D',
  '#B81CFF',
  '#FF8F3C',
  '#FFB300',
  '#D81FF0',
  '#FF8A00',
  '#FF7A00',
];

export function PremiumEarningsGradientCard({ children, style }: PremiumEarningsGradientCardProps) {
  return (
    <View style={[styles.shell, style]}>
      <View pointerEvents="none" style={styles.innerClip}>
        <MeshGradientView
          style={StyleSheet.absoluteFillObject}
          columns={3}
          rows={3}
          points={MESH_POINTS}
          colors={MESH_COLORS}
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
    backgroundColor: '#E7B27A',
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
