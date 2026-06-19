import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppInput } from './app-input';
import { LiquidModalBackdrop, LiquidSheetSurface } from './liquid-sheet-surface';

type FilterSheetProps = {
  visible: boolean;
  title: string;
  activeCount: number;
  applyDisabled?: boolean;
  applyError?: string | null;
  onCancel: () => void;
  onApply: () => void;
  onClear?: () => void;
  children: ReactNode;
};

type FilterOptionProps = {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
};

type FilterRangeProps = {
  label: string;
  minValue: string;
  maxValue: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  error?: string | null;
};

const SHEET_RADIUS = 30;
const HIDDEN_OFFSET = 560;

export function FilterSheet({
  visible,
  title,
  activeCount,
  applyDisabled,
  applyError,
  onCancel,
  onApply,
  onClear,
  children,
}: FilterSheetProps) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(HIDDEN_OFFSET)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const sheetHeight = Math.round(
    Math.min(window.height * 0.65, Math.max(window.height * 0.5, 440)),
  );

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          speed: 24,
          bounciness: 5,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: HIDDEN_OFFSET,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [opacity, translateY, visible]);

  if (!mounted) return null;

  const applyLabel = activeCount > 0 ? `Apply filters (${activeCount})` : 'Apply filters';

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.modalRoot}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel filters"
            style={StyleSheet.absoluteFill}
            onPress={onCancel}
          >
            <LiquidModalBackdrop />
          </Pressable>
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetFrame,
            {
              height: sheetHeight,
              paddingBottom: Math.max(insets.bottom, theme.spacing.sm) + theme.spacing.sm,
              transform: [{ translateY }],
            },
          ]}
        >
          <SheetSurface>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel filters"
                onPress={onCancel}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear all filters"
                disabled={activeCount === 0 || !onClear}
                onPress={onClear}
                style={({ pressed }) => [
                  styles.clearButton,
                  pressed && activeCount > 0 && styles.pressed,
                  activeCount === 0 && styles.disabled,
                ]}
              >
                <Text style={styles.clearText}>Clear all</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentInner}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {applyError ? <Text style={styles.applyError}>{applyError}</Text> : null}

            <View style={styles.footer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={applyLabel}
                disabled={applyDisabled}
                onPress={onApply}
                style={({ pressed }) => [
                  styles.applyButton,
                  pressed && !applyDisabled && styles.applyPressed,
                  applyDisabled && styles.disabled,
                ]}
              >
                <Text style={styles.applyText}>{applyLabel}</Text>
              </Pressable>
            </View>
          </SheetSurface>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function FilterSheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function FilterOption({ label, description, selected, onPress }: FilterOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        selected && styles.optionRowSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.optionCopy}>
        <Text style={styles.optionLabel}>{label}</Text>
        {description ? <Text style={styles.optionDescription}>{description}</Text> : null}
      </View>
      <View style={[styles.checkCircle, selected && styles.checkCircleSelected]}>
        {selected ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
      </View>
    </Pressable>
  );
}

export function FilterRange({
  label,
  minValue,
  maxValue,
  minPlaceholder = 'Min',
  maxPlaceholder = 'Max',
  onMinChange,
  onMaxChange,
  error,
}: FilterRangeProps) {
  return (
    <View style={styles.rangeGroup}>
      <Text style={styles.rangeLabel}>{label}</Text>
      <View style={styles.rangeRow}>
        <AppInput
          size="sm"
          containerStyle={styles.rangeInputContainer}
          accessibilityLabel={`${label} minimum`}
          value={minValue}
          onChangeText={onMinChange}
          placeholder={minPlaceholder}
          placeholderTextColor="rgba(255,255,255,0.32)"
          keyboardType="numeric"
          inputMode="numeric"
          inputStyle={styles.rangeInputText}
        />
        <AppInput
          size="sm"
          containerStyle={styles.rangeInputContainer}
          accessibilityLabel={`${label} maximum`}
          value={maxValue}
          onChangeText={onMaxChange}
          placeholder={maxPlaceholder}
          placeholderTextColor="rgba(255,255,255,0.32)"
          keyboardType="numeric"
          inputMode="numeric"
          inputStyle={styles.rangeInputText}
        />
      </View>
      {error ? <Text style={styles.rangeError}>{error}</Text> : null}
    </View>
  );
}

function SheetSurface({ children }: { children: ReactNode }) {
  return <LiquidSheetSurface style={styles.surface}>{children}</LiquidSheetSurface>;
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetFrame: {
    marginHorizontal: 0,
  },
  surface: {
    flex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  headerRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
  },
  cancelButton: {
    minHeight: 44,
    minWidth: 68,
    justifyContent: 'center',
  },
  cancelText: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '600',
  },
  title: {
    ...theme.typography.section,
    color: theme.colors.foreground,
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
  },
  clearButton: {
    minHeight: 44,
    minWidth: 68,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  clearText: {
    ...theme.typography.caption,
    color: theme.colors.pink,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.54)',
    textTransform: 'uppercase',
  },
  sectionBody: {
    gap: theme.spacing.sm,
  },
  optionRow: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  optionRowSelected: {
    borderColor: 'rgba(242,142,175,0.58)',
    backgroundColor: 'rgba(242,142,175,0.13)',
  },
  optionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  optionLabel: {
    ...theme.typography.body,
    color: theme.colors.foreground,
    fontWeight: '700',
  },
  optionDescription: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.48)',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  checkCircleSelected: {
    borderColor: theme.colors.pink,
    backgroundColor: theme.colors.accentStrong,
  },
  rangeGroup: {
    gap: theme.spacing.sm,
  },
  rangeLabel: {
    ...theme.typography.body,
    color: theme.colors.foreground,
    fontWeight: '700',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  rangeInputContainer: {
    flex: 1,
  },
  rangeInputText: {
    ...theme.typography.mono,
  },
  rangeError: {
    ...theme.typography.label,
    color: theme.colors.danger,
  },
  applyError: {
    ...theme.typography.label,
    color: theme.colors.danger,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xs,
  },
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.11)',
  },
  applyButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.buttonPrimary,
  },
  applyText: {
    ...theme.typography.body,
    color: theme.colors.buttonPrimaryText,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.78,
  },
  applyPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.38,
  },
});
