import { theme } from '@/constants/theme';
import Foundation from '@expo/vector-icons/Foundation';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { impactAsync, ImpactFeedbackStyle, selectionAsync } from 'expo-haptics';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Platform, Pressable, View, type ImageSourcePropType, type ViewStyle } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

type Variant = 'glass' | 'surface' | 'tile';
type HapticFlavor = 'light' | 'medium' | 'rigid' | 'selection';
type FallbackIconFamily = 'ionicons' | 'foundation';
type IoniconsName = ComponentProps<typeof Ionicons>['name'];
type FoundationName = ComponentProps<typeof Foundation>['name'];

type Props = {
  symbol: SFSymbol;
  fallbackIcon?: IoniconsName | FoundationName;
  fallbackIconFamily?: FallbackIconFamily;
  preferFallbackIcon?: boolean;
  fallbackSize?: number;
  symbolSize?: number;
  tintColor?: string;
  variant?: Variant;
  size?: number;
  onPress: () => void;
  hitSlop?: number;
  style?: ViewStyle;
  haptic?: HapticFlavor;
  /** When set, shows this image (e.g. profile photo) instead of the SF Symbol */
  imageUri?: string | null;
  /** Static local image used as the button icon. Ignored when imageUri is present. */
  imageSource?: ImageSourcePropType;
  imageSize?: number;
  accessibilityLabel?: string;
  glassRendering?: 'native' | 'blur';
};

const VARIANT_DEFAULTS: Record<Variant, { size: number; symbolSize: number; tintColor: string }> = {
  glass: { size: 62, symbolSize: 28, tintColor: theme.colors.foreground },
  surface: { size: 34, symbolSize: 18, tintColor: theme.colors.foreground },
  tile: { size: 40, symbolSize: 20, tintColor: theme.colors.accentStrong },
};

async function triggerHaptic(flavor: HapticFlavor) {
  if (Platform.OS !== 'ios') return;
  if (flavor === 'selection') {
    await selectionAsync();
  } else {
    const style =
      flavor === 'medium'
        ? ImpactFeedbackStyle.Medium
        : flavor === 'rigid'
          ? ImpactFeedbackStyle.Rigid
          : ImpactFeedbackStyle.Light;
    await impactAsync(style);
  }
}

export function NativeIconButton({
  symbol,
  fallbackIcon,
  fallbackIconFamily = 'ionicons',
  preferFallbackIcon = false,
  fallbackSize,
  symbolSize,
  tintColor,
  variant = 'surface',
  size,
  onPress,
  hitSlop = 8,
  style,
  haptic = 'light',
  imageUri,
  imageSource,
  imageSize,
  accessibilityLabel,
  glassRendering = 'native',
}: Props) {
  const defaults = VARIANT_DEFAULTS[variant];
  const containerSize = size ?? defaults.size;
  const iconSize = symbolSize ?? defaults.symbolSize;
  const iconColor = tintColor ?? defaults.tintColor;
  const radius = containerSize / 2;

  const handlePress = () => {
    void triggerHaptic(haptic);
    onPress();
  };

  const resolvedUri = typeof imageUri === 'string' ? imageUri.trim() : '';
  const showPhoto = resolvedUri.length > 0;
  const iconImageSize = imageSize ?? fallbackSize ?? iconSize;
  const fallbackIconNode = fallbackIcon ? (
    <View
      style={{
        width: iconSize,
        height: iconSize,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {fallbackIconFamily === 'foundation' ? (
        <Foundation
          name={fallbackIcon as FoundationName}
          size={fallbackSize ?? iconSize}
          color={iconColor}
        />
      ) : (
        <Ionicons
          name={fallbackIcon as IoniconsName}
          size={fallbackSize ?? iconSize}
          color={iconColor}
        />
      )}
    </View>
  ) : undefined;

  const icon = showPhoto ? (
    <Image
      source={{ uri: resolvedUri }}
      style={{
        width: containerSize - 6,
        height: containerSize - 6,
        borderRadius: (containerSize - 6) / 2,
      }}
      contentFit="cover"
      transition={200}
    />
  ) : imageSource ? (
    <Image
      source={imageSource}
      style={{ width: iconImageSize, height: iconImageSize }}
      contentFit="contain"
      accessibilityIgnoresInvertColors
    />
  ) : preferFallbackIcon && fallbackIconNode ? (
    fallbackIconNode
  ) : (
    <SymbolView
      name={symbol}
      size={iconSize}
      tintColor={iconColor}
      type="monochrome"
      fallback={fallbackIconNode}
    />
  );

  if (variant === 'glass') {
    const glassStyle: ViewStyle = {
      width: containerSize,
      height: containerSize,
      borderRadius: radius,
      alignItems: 'center',
      justifyContent: 'center',
    };

    if (glassRendering === 'native' && isLiquidGlassAvailable()) {
      return (
        <GlassView isInteractive style={[glassStyle, style]}>
          <Pressable
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            hitSlop={hitSlop}
            style={({ pressed }) => ({
              opacity: pressed ? 0.92 : 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: showPhoto ? 3 : (containerSize - iconSize) / 2,
            })}
          >
            {icon}
          </Pressable>
        </GlassView>
      );
    }

    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={hitSlop}
        style={[
          { width: containerSize, height: containerSize, borderRadius: radius, overflow: 'hidden' },
          style,
        ]}
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
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.24)',
              backgroundColor: 'rgba(255,255,255,0.06)',
              opacity: pressed ? 0.94 : 1,
            }}
          >
            {icon}
          </BlurView>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        {
          width: containerSize,
          height: containerSize,
          borderRadius: radius,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.92 : 1,
        },
        variant === 'surface' && {
          backgroundColor: theme.colors.surfaceWarm,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        variant === 'tile' && {
          backgroundColor: theme.colors.accentSoft,
        },
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}
