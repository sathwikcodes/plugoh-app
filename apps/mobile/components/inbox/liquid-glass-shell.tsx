import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Frosted glass container used across the chat thread (compose bar, identity pill,
 * empty/loading states). Uses native liquid glass when available, BlurView otherwise.
 */
export function LiquidGlassShell({ children, style }: Props) {
  const shell: StyleProp<ViewStyle> = [styles.shell, style];
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="dark" style={shell}>
        {children}
      </GlassView>
    );
  }
  return (
    <BlurView tint="systemUltraThinMaterialDark" intensity={88} style={shell}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 24,
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
});
