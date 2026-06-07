import { GlassCard } from '@/components/ui/glass-card';
import { theme } from '@/constants/theme';
import { CARD_CLUSTER_RADIUS, WITHDRAW_BTN_HEIGHT } from '@/lib/influencer/earnings';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

function GlassWithdrawButton({ onPress }: { onPress: () => void }) {
  const shell: ViewStyle = {
    width: '100%',
    height: WITHDRAW_BTN_HEIGHT,
    borderRadius: WITHDRAW_BTN_HEIGHT / 2,
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  };

  const label = (
    <View style={styles.row}>
      <Ionicons name="arrow-up-circle-outline" size={22} color="rgba(255,255,255,0.92)" />
      <Text style={styles.label}>Withdraw</Text>
    </View>
  );

  const fire = () => {
    void impactAsync(ImpactFeedbackStyle.Light);
    onPress();
  };

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView isInteractive glassEffectStyle="regular" colorScheme="dark" style={shell}>
        <Pressable
          onPress={fire}
          accessibilityRole="button"
          accessibilityLabel="Withdraw"
          style={({ pressed }) => [styles.pressable, { opacity: pressed ? 0.92 : 1 }]}
        >
          {label}
        </Pressable>
      </GlassView>
    );
  }

  return (
    <Pressable
      onPress={fire}
      accessibilityRole="button"
      accessibilityLabel="Withdraw"
      style={({ pressed }) => [shell, { opacity: pressed ? 0.94 : 1 }]}
    >
      <BlurView tint="systemUltraThinMaterialDark" intensity={80} style={styles.blurInner}>
        {label}
      </BlurView>
    </Pressable>
  );
}

export function EarningsWithdrawColumn({ onPress }: { onPress: () => void }) {
  return (
    <GlassCard style={styles.shell} contentStyle={styles.inner}>
      <GlassWithdrawButton onPress={onPress} />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    borderRadius: CARD_CLUSTER_RADIUS,
  },
  inner: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  label: {
    ...theme.typography.cardTitle,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '700',
  },
});
