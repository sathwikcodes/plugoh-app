import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

const SEARCH_HEIGHT = 46;
const SEARCH_TEXT = '#FFFFFF';
const SEARCH_PLACEHOLDER_TONE = 'rgba(255,255,255,0.74)';
const SEARCH_SELECTION = '#FFFFFF';

export type GlassSearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
};

export function GlassSearchField({ value, onChangeText, placeholder }: GlassSearchFieldProps) {
  return (
    <BlurView tint="systemUltraThinMaterialDark" intensity={68} style={styles.shell}>
      <View style={styles.inner}>
        <Ionicons name="search" size={19} color={SEARCH_PLACEHOLDER_TONE} style={styles.icon} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={SEARCH_PLACEHOLDER_TONE}
          cursorColor={SEARCH_TEXT}
          selectionColor={SEARCH_SELECTION}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          accessibilityLabel="Search campaigns"
          style={styles.input}
        />
        {value.length > 0 ? (
          <Pressable
            onPress={() => {
              onChangeText('');
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={10}
            style={({ pressed }) => [
              styles.clearButton,
              pressed ? styles.clearButtonPressed : null,
            ]}
          >
            <Ionicons name="close-circle" size={18} color={SEARCH_TEXT} />
          </Pressable>
        ) : null}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    height: SEARCH_HEIGHT,
  },
  icon: {
    marginTop: 1,
  },
  input: {
    flex: 1,
    height: SEARCH_HEIGHT,
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
    color: SEARCH_TEXT,
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: 0,
    textAlignVertical: 'center',
  },
  clearButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonPressed: {
    opacity: 0.72,
  },
});
