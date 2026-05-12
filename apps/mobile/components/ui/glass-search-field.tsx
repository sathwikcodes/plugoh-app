import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { TextInput, View } from 'react-native';

const SEARCH_TEXT = 'rgba(255,255,255,0.72)';
const SEARCH_PLACEHOLDER_TONE = 'rgba(255,255,255,0.42)';

export type GlassSearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
};

export function GlassSearchField({ value, onChangeText, placeholder }: GlassSearchFieldProps) {
  const inner = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        minHeight: 48,
      }}
    >
      <Ionicons name="search" size={20} color={SEARCH_PLACEHOLDER_TONE} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={SEARCH_PLACEHOLDER_TONE}
        cursorColor={SEARCH_TEXT}
        selectionColor="rgba(255,255,255,0.35)"
        style={{
          flex: 1,
          ...theme.typography.body,
          color: SEARCH_TEXT,
          paddingVertical: theme.spacing.sm,
          backgroundColor: 'transparent',
        }}
      />
    </View>
  );

  const shellStyle = {
    borderRadius: theme.radius.pill,
    overflow: 'hidden' as const,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  };

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="dark" style={shellStyle}>
        {inner}
      </GlassView>
    );
  }

  return (
    <BlurView tint="systemUltraThinMaterialDark" intensity={80} style={shellStyle}>
      {inner}
    </BlurView>
  );
}
