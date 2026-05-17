import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

const FRAME_BORDER = 'rgba(255,255,255,0.18)';

export type GlassCardProps = {
  children: ReactNode;
  /** Outer frame: radius, flex, width, minHeight, etc. */
  style?: ViewStyle;
  /** Inner column: padding, gap, flex, justifyContent */
  contentStyle?: ViewStyle;
  /**
   * Optional wash over the glass (e.g. soft danger tint). Rendered above blur, below children.
   */
  tintOverlayColor?: string;
};

/**
 * Frosted panel matching `NativeIconButton` / `GlassWithdrawButton` — `GlassView` on
 * supported iOS, `BlurView` elsewhere.
 */
export function GlassCard({ children, style, contentStyle, tintOverlayColor }: GlassCardProps) {
  const shell: ViewStyle = {
    borderWidth: 1,
    borderColor: FRAME_BORDER,
    overflow: 'hidden',
    borderCurve: 'continuous',
    ...style,
  };

  const inner = (
    <View style={[styles.inner, contentStyle]}>
      {tintOverlayColor ? (
        <View
          pointerEvents="none"
          style={[styles.tintOverlay, { backgroundColor: tintOverlayColor }]}
        />
      ) : null}
      {children}
    </View>
  );

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="dark" style={shell}>
        {inner}
      </GlassView>
    );
  }

  return (
    <BlurView tint="systemUltraThinMaterialDark" intensity={80} style={shell}>
      {inner}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  inner: {
    flexDirection: 'column',
    position: 'relative',
  },
  tintOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
