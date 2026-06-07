import { LiquidGlassShell } from '@/components/inbox/liquid-glass-shell';
import { ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** Fills the list area and centers content (rendered outside the inverted list). */
function Center({ children }: { children: ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

export function ThreadMessagesSkeleton() {
  return (
    <Center>
      <LiquidGlassShell style={styles.shell}>
        <View style={styles.inner}>
          <View style={styles.pulseWrap}>
            <ShimmerText width="100%" height={14} />
            <ShimmerText width="78%" height={14} />
            <ShimmerText width="48%" height={14} />
          </View>
          <ShimmerText width={128} height={15} style={{ marginTop: theme.spacing.lg }} />
        </View>
      </LiquidGlassShell>
    </Center>
  );
}

export function EmptyMessagesPlaceholder() {
  return (
    <Center>
      <LiquidGlassShell style={styles.shell}>
        <View style={styles.inner}>
          <SymbolView
            name="bubble.left.and.bubble.right"
            size={36}
            tintColor="rgba(255,255,255,0.22)"
            type="monochrome"
            fallback={
              <Ionicons name="chatbubbles-outline" size={36} color="rgba(255,255,255,0.22)" />
            }
          />
          <Text style={styles.title}>No messages here yet</Text>
          <Text style={styles.subtitle}>
            When the chat is open, new messages will show up in this thread.
          </Text>
        </View>
      </LiquidGlassShell>
    </Center>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  shell: {
    maxWidth: 340,
    width: '100%',
  },
  inner: {
    alignItems: 'center',
    paddingVertical: theme.spacing.hero,
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  pulseWrap: {
    width: '100%',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    ...theme.typography.section,
    color: 'rgba(255,255,255,0.52)',
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.32)',
    textAlign: 'center',
  },
});
