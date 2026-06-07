import { LiquidGlassShell } from '@/components/inbox/liquid-glass-shell';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

/** Shown in place of the composer when the campaign is outside chat-enabled states. */
export function ChatDisabledBanner() {
  return (
    <LiquidGlassShell style={styles.shell}>
      <View style={styles.inner}>
        <View style={styles.iconWrap}>
          <SymbolView
            name="lock.fill"
            size={18}
            tintColor="rgba(255,255,255,0.55)"
            type="monochrome"
            fallback={<Ionicons name="lock-closed" size={18} color="rgba(255,255,255,0.55)" />}
          />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title}>Chat is locked</Text>
          <Text style={styles.subtitle}>
            The campaign must be active before you can send messages here.
          </Text>
        </View>
      </View>
    </LiquidGlassShell>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginHorizontal: theme.spacing.md,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.xxl,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    gap: theme.spacing.sm,
    minWidth: 0,
  },
  title: {
    ...theme.typography.cardTitle,
    color: 'rgba(255,255,255,0.88)',
  },
  subtitle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.42)',
  },
});
