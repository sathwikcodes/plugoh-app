import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { TextInput, View } from 'react-native';

const SEARCH_HEIGHT = 48;
const SEARCH_INPUT_HEIGHT = 22;
const SEARCH_INPUT_LINE_HEIGHT = 20;
const SEARCH_TEXT = '#FFFFFF';
const SEARCH_PLACEHOLDER_TONE = 'rgba(255,255,255,0.82)';
const SEARCH_SELECTION = 'rgba(255,255,255,0.32)';

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
        height: SEARCH_HEIGHT,
      }}
    >
      <Ionicons name="search" size={20} color={SEARCH_PLACEHOLDER_TONE} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={SEARCH_PLACEHOLDER_TONE}
        cursorColor={SEARCH_TEXT}
        selectionColor={SEARCH_SELECTION}
        style={{
          flex: 1,
          ...theme.typography.body,
          lineHeight: SEARCH_INPUT_LINE_HEIGHT,
          color: SEARCH_TEXT,
          height: SEARCH_INPUT_HEIGHT,
          padding: 0,
          margin: 0,
          backgroundColor: 'transparent',
          includeFontPadding: false,
          textAlignVertical: 'center',
          transform: [{ translateY: -1 }],
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
