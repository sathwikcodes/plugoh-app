import { filterSheetStyles as styles } from '@/components/inbox/filter-sheet/styles';
import type { HeaderIconName } from '@/lib/inbox/filter-options';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Pressable, StyleSheet, View } from 'react-native';

type Props = {
  icon: HeaderIconName;
  accessibilityLabel: string;
  onPress: () => void;
};

/** Frosted-glass circular header button (back / close) for the premium sheet. */
export function LiquidHeaderIconButton({ icon, accessibilityLabel, onPress }: Props) {
  const iconSize = icon === 'close' ? 23 : 21;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButtonPressable,
        pressed && styles.iconButtonPressablePressed,
      ]}
    >
      <View style={styles.iconButtonShell}>
        {isLiquidGlassAvailable() ? (
          <GlassView glassEffectStyle="regular" colorScheme="dark" style={styles.nativeIconButton}>
            <Ionicons name={icon} size={iconSize} color="#FFFFFF" />
          </GlassView>
        ) : (
          <>
            <BlurView
              tint="systemUltraThinMaterialDark"
              intensity={86}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.iconButtonTint} />
            <View style={styles.iconButtonTopHighlight} />
            <View style={styles.iconButtonBottomShade} />
            <View style={styles.iconButtonContent}>
              <Ionicons name={icon} size={iconSize} color="#FFFFFF" />
            </View>
          </>
        )}
      </View>
    </Pressable>
  );
}
