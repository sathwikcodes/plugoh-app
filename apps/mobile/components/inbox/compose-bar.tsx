import { LiquidGlassShell } from '@/components/inbox/liquid-glass-shell';
import { AppInput } from '@/components/ui/app-input';
import { GlassCircleButton } from '@/components/ui/glass-circle-button';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

const CONTROL_HEIGHT = 44;

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttachment: () => void;
  isSending: boolean;
  bottomInset: number;
};

export function ComposeBar({
  value,
  onChangeText,
  onSend,
  onAttachment,
  isSending,
  bottomInset,
}: Props) {
  const canSend = value.trim().length > 0 && !isSending;

  return (
    <View style={[styles.compose, { paddingBottom: Math.max(bottomInset, 10) }]}>
      <GlassCircleButton
        symbol="paperclip"
        fallbackIcon="attach"
        onPress={onAttachment}
        size={CONTROL_HEIGHT}
        symbolSize={18}
        accessibilityLabel="Attach file"
      />
      <AppInput
        containerStyle={styles.inputShell}
        fieldStyle={styles.inputField}
        value={value}
        onChangeText={onChangeText}
        placeholder="Message..."
        placeholderTextColor="rgba(255,255,255,0.74)"
        autoGrow={{ minHeight: CONTROL_HEIGHT, maxHeight: 120 }}
        returnKeyType="default"
        maxLength={4000}
        accessibilityLabel="Message"
      />
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        accessibilityLabel="Send message"
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => [
          styles.sendPressable,
          { opacity: !canSend ? 0.46 : pressed ? 0.88 : 1 },
        ]}
      >
        <LiquidGlassShell style={styles.sendButton}>
          <SymbolView
            name="arrow.up"
            size={16}
            tintColor={canSend ? '#FFFFFF' : 'rgba(255,255,255,0.42)'}
            type="monochrome"
            fallback={
              <Ionicons
                name="arrow-up"
                size={16}
                color={canSend ? '#FFFFFF' : 'rgba(255,255,255,0.42)'}
              />
            }
          />
        </LiquidGlassShell>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  compose: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  inputShell: {
    flex: 1,
  },
  inputField: {
    borderRadius: CONTROL_HEIGHT / 2,
  },
  sendPressable: {
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    borderRadius: CONTROL_HEIGHT / 2,
    overflow: 'hidden',
  },
  sendButton: {
    flex: 1,
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    borderRadius: CONTROL_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
