import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

const ICON_TONE = 'rgba(255,255,255,0.72)';

export type GlassCircleButtonProps = {
  symbol: SFSymbol;
  fallbackIcon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  /** Defaults to 48 to align with `GlassSearchField` row height */
  size?: number;
  symbolSize?: number;
  /** SF Symbol / fallback vector tint */
  tintColor?: string;
  accessibilityLabel?: string;
};

export function GlassCircleButton({
  symbol,
  fallbackIcon,
  onPress,
  size = 48,
  symbolSize = 22,
  tintColor = ICON_TONE,
  accessibilityLabel,
}: GlassCircleButtonProps) {
  const radius = size / 2;

  const icon = (
    <SymbolView
      name={symbol}
      size={symbolSize}
      tintColor={tintColor}
      type="monochrome"
      fallback={<Ionicons name={fallbackIcon} size={symbolSize} color={tintColor} />}
    />
  );

  const shellStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    overflow: 'hidden' as const,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  };

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView isInteractive glassEffectStyle="regular" colorScheme="dark" style={shellStyle}>
        <Pressable
          onPress={onPress}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => ({
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.92 : 1,
          })}
        >
          {icon}
        </Pressable>
      </GlassView>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      style={[shellStyle]}
    >
      {({ pressed }) => (
        <BlurView
          tint="systemUltraThinMaterialDark"
          intensity={80}
          style={{
            flex: 1,
            borderRadius: radius,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.94 : 1,
          }}
        >
          {icon}
        </BlurView>
      )}
    </Pressable>
  );
}
