import { theme } from '@/constants/theme';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

type Props = {
  action: 'accepted' | 'declined';
  onUndo: () => void;
  onExpire: () => void;
  duration?: number;
};

export function SwipeUndoToast({ action, onUndo, onExpire, duration = 3000 }: Props) {
  const [remaining, setRemaining] = useState(Math.ceil(duration / 1000));
  const expireRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    expireRef.current = setTimeout(onExpire, duration);
    tickRef.current = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      if (expireRef.current) clearTimeout(expireRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  function handleUndo() {
    if (expireRef.current) clearTimeout(expireRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    onUndo();
  }

  const label = action === 'accepted' ? 'Campaign accepted' : 'Campaign declined';
  const dotColor = action === 'accepted' ? '#4CAF50' : '#F44336';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.sheet,
        borderWidth: 1,
        borderColor: theme.colors.borderStrong,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        marginHorizontal: theme.spacing.lg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: dotColor,
          }}
        />
        <Text style={{ ...theme.typography.body, color: theme.colors.foreground }}>{label}</Text>
      </View>
      <Pressable onPress={handleUndo} hitSlop={12}>
        <Text style={{ ...theme.typography.label, color: theme.colors.accentStrong }}>
          Undo ({remaining}s)
        </Text>
      </Pressable>
    </View>
  );
}
