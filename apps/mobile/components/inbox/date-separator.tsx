import { theme } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';

type Props = { date: string };

function groupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function DateSeparator({ date }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{groupLabel(date)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  label: {
    ...theme.typography.labelSmall,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
    textAlign: 'center',
  },
});
