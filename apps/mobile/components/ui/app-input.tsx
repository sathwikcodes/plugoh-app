import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ColorValue,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type FocusEvent = Parameters<NonNullable<TextInputProps['onFocus']>>[0];
type BlurEvent = Parameters<NonNullable<TextInputProps['onBlur']>>[0];

/**
 * AppInput — the single, canonical text input for the entire app.
 *
 * One component for every text-entry surface: onboarding fields, search bars,
 * phone / email / numeric inputs, price entry, message composers, etc. It renders
 * a native-feeling iOS "liquid glass" field (GlassView on iOS 26+, BlurView
 * fallback elsewhere) with white text, perfectly centered placeholder, a focus
 * transition, and slots for leading icons, prefixes, and trailing controls.
 *
 * Prefer extending this component over hand-rolling another TextInput wrapper.
 */

const WHITE = '#FFFFFF';

/** Global, iOS-aligned sizing scale. 16px text everywhere to avoid auto-zoom. */
type AppInputSize = 'sm' | 'md' | 'lg';
type AppInputVariant = 'field' | 'search';

const SIZE_TOKENS: Record<AppInputSize, { height: number; radius: number; paddingX: number }> = {
  sm: { height: 52, radius: 16, paddingX: 16 },
  md: { height: 60, radius: 24, paddingX: 20 },
  lg: { height: 120, radius: 20, paddingX: 18 },
};

const SEARCH_TOKENS = { height: 46, radius: theme.radius.pill, paddingX: 16 };

const REST_BORDER = 'rgba(255,255,255,0.22)';
const FOCUS_BORDER = 'rgba(255,255,255,0.62)';
const PLACEHOLDER_TONE = 'rgba(255,255,255,0.48)';
const SEARCH_PLACEHOLDER_TONE = 'rgba(255,255,255,0.6)';
const ICON_TONE = 'rgba(255,255,255,0.82)';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export type AppInputProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  /** Pill search bar vs. standard rounded field. */
  variant?: AppInputVariant;
  /** Height/radius preset. `lg` is for multiline. Ignored for `search`. */
  size?: AppInputSize;
  /** Optional label rendered above the field. */
  label?: string;
  /** Error message rendered below the field; also tints the focus ring red. */
  error?: string;
  /** Persistent helper text below the field (hidden when `error` is shown). */
  helperText?: string;
  /** Leading Ionicons glyph (e.g. "search", "mail-outline"). */
  leadingIcon?: keyof typeof Ionicons.glyphMap;
  /** Arbitrary leading node (flag, avatar). Takes precedence over `leadingIcon`. */
  leadingSlot?: ReactNode;
  /** Inline prefix node rendered immediately before the text (e.g. "+91", "₹"). */
  prefix?: ReactNode;
  /** Arbitrary trailing node (stepper, send button). */
  trailingSlot?: ReactNode;
  /** Show a busy spinner on the trailing edge. */
  loading?: boolean;
  /** Show an iOS-style clear (×) button when there is text. Default true for search. */
  showClearButton?: boolean;
  /** Called when the clear button is pressed (defaults to onChangeText('')). */
  onClear?: () => void;
  /** Override the placeholder color. */
  placeholderTextColor?: ColorValue;
  /** Style for the outer wrapper (label + field + error). */
  containerStyle?: StyleProp<ViewStyle>;
  /** Style applied to the rounded field shell. */
  fieldStyle?: StyleProp<ViewStyle>;
  /** Style merged into the TextInput. */
  inputStyle?: StyleProp<TextStyle>;
  /**
   * Auto-grow multiline mode (e.g. a chat composer). The field grows with its
   * content from `minHeight` (defaults to the size token height) up to
   * `maxHeight`, then scrolls internally. Implies `multiline`.
   */
  autoGrow?: { minHeight?: number; maxHeight: number };
};

function useReduceMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}

export const AppInput = forwardRef<TextInput, AppInputProps>(function AppInput(
  {
    variant = 'field',
    size = 'md',
    label,
    error,
    helperText,
    leadingIcon,
    leadingSlot,
    prefix,
    trailingSlot,
    loading = false,
    showClearButton,
    onClear,
    placeholderTextColor,
    containerStyle,
    fieldStyle,
    inputStyle,
    autoGrow,
    multiline,
    value,
    onChangeText,
    onFocus,
    onBlur,
    editable = true,
    accessibilityLabel,
    ...textInputProps
  },
  ref,
) {
  const reduceMotion = useReduceMotion();
  const innerRef = useRef<TextInput>(null);
  useImperativeHandle(ref, () => innerRef.current as TextInput, []);

  const focus = useSharedValue(0);

  const isSearch = variant === 'search';
  const effectiveSize = isSearch ? 'sm' : size;
  const tokens = isSearch ? SEARCH_TOKENS : SIZE_TOKENS[effectiveSize];
  const growing = Boolean(autoGrow);
  const growMin = autoGrow?.minHeight ?? tokens.height;
  const growMax = autoGrow?.maxHeight;
  const isMultiline = Boolean(multiline) || (!isSearch && size === 'lg') || growing;

  const handleFocus = useCallback(
    (event: FocusEvent) => {
      focus.value = withTiming(1, { duration: reduceMotion ? 0 : 170 });
      onFocus?.(event);
    },
    [focus, onFocus, reduceMotion],
  );

  const handleBlur = useCallback(
    (event: BlurEvent) => {
      focus.value = withTiming(0, { duration: reduceMotion ? 0 : 170 });
      onBlur?.(event);
    },
    [focus, onBlur, reduceMotion],
  );

  const handleClear = useCallback(() => {
    if (onClear) {
      onClear();
    } else {
      onChangeText?.('');
    }
    innerRef.current?.focus();
  }, [onChangeText, onClear]);

  const ringStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? theme.colors.danger
      : interpolateColor(focus.value, [0, 1], [REST_BORDER, FOCUS_BORDER]),
  }));

  const hasValue = typeof value === 'string' && value.length > 0;
  const clearVisible = (showClearButton ?? isSearch) && hasValue && !loading && editable;

  const inputTextStyle = useMemo<TextStyle>(
    () => ({
      flex: 1,
      color: WHITE,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      fontFamily: theme.typography.body.fontFamily,
      fontSize: theme.typography.body.fontSize,
      fontWeight: theme.typography.body.fontWeight,
      letterSpacing: theme.typography.body.letterSpacing,
      // Vertical centering: let iOS center single-line text natively (no lineHeight),
      // and disable Android's extra font padding so the placeholder sits dead-center.
      textAlignVertical: growing || !isMultiline ? 'center' : 'top',
      ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
      ...(growing
        ? {
            lineHeight: 20,
            minHeight: growMin,
            maxHeight: growMax,
            paddingVertical: Math.max((growMin - 20) / 2, 8),
          }
        : isMultiline
          ? { lineHeight: 22, height: '100%', paddingTop: 2 }
          : { height: '100%' }),
    }),
    [growing, growMax, growMin, isMultiline],
  );

  const fieldShellStyle: StyleProp<ViewStyle> = [
    styles.shell,
    growing
      ? { borderRadius: tokens.radius, minHeight: growMin, maxHeight: growMax }
      : { borderRadius: tokens.radius, height: tokens.height },
    fieldStyle,
  ];

  const rowStyle: StyleProp<ViewStyle> = [
    styles.row,
    {
      paddingHorizontal: tokens.paddingX,
      alignItems: isMultiline && !growing ? 'flex-start' : 'center',
      paddingVertical: isMultiline && !growing ? 14 : 0,
    },
  ];

  const placeholderColor =
    placeholderTextColor ?? (isSearch ? SEARCH_PLACEHOLDER_TONE : PLACEHOLDER_TONE);

  const fieldBody = (
    <View style={rowStyle} pointerEvents={editable ? 'auto' : 'none'}>
      {leadingSlot ?? null}
      {!leadingSlot && (leadingIcon || isSearch) ? (
        <Ionicons
          name={leadingIcon ?? 'search'}
          size={19}
          color={ICON_TONE}
          style={styles.leadingIcon}
        />
      ) : null}
      {prefix ? <View style={styles.prefix}>{prefix}</View> : null}
      <TextInput
        {...textInputProps}
        ref={innerRef}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        multiline={isMultiline}
        onFocus={handleFocus}
        onBlur={handleBlur}
        accessibilityLabel={accessibilityLabel ?? label}
        placeholderTextColor={placeholderColor}
        cursorColor={WHITE}
        selectionColor={WHITE}
        style={[inputTextStyle, inputStyle]}
      />
      {loading ? (
        <ActivityIndicator color={WHITE} size="small" style={styles.trailing} />
      ) : clearVisible ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(120)}
          exiting={reduceMotion ? undefined : FadeOut.duration(100)}
        >
          <Pressable
            onPress={handleClear}
            accessibilityRole="button"
            accessibilityLabel="Clear text"
            hitSlop={10}
            style={({ pressed }) => [styles.clearButton, pressed ? styles.pressedSoft : null]}
          >
            <Ionicons name="close-circle" size={18} color={ICON_TONE} />
          </Pressable>
        </Animated.View>
      ) : (
        (trailingSlot ?? null)
      )}
    </View>
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[fieldShellStyle, !editable ? styles.disabled : null]}>
        {isLiquidGlassAvailable() ? (
          <GlassView
            glassEffectStyle="regular"
            colorScheme="dark"
            style={[styles.surface, { borderRadius: tokens.radius }]}
          >
            {fieldBody}
          </GlassView>
        ) : (
          <AnimatedBlurView
            tint="systemUltraThinMaterialDark"
            intensity={isSearch ? 68 : 88}
            style={[styles.surface, { borderRadius: tokens.radius }]}
          >
            {fieldBody}
          </AnimatedBlurView>
        )}
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { borderRadius: tokens.radius }, ringStyle]}
        />
      </View>
      {error ? (
        <Text style={styles.errorText} selectable>
          {error}
        </Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  label: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.74)',
    paddingHorizontal: 4,
  },
  shell: {
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  surface: {
    flex: 1,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  leadingIcon: {
    marginRight: -2,
  },
  prefix: {
    justifyContent: 'center',
  },
  trailing: {
    width: 24,
    height: 24,
  },
  clearButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedSoft: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.55,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    paddingHorizontal: 4,
  },
  helperText: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 4,
  },
});
