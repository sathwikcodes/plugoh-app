import {
  DEFAULT_INBOX_FILTERS,
  DEFAULT_INBOX_SORT,
  inboxActiveFilterCount,
  type InboxFilter,
  type InboxFilterDraft,
  type InboxSort,
} from '@/lib/filters/inbox';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FilterOption, FilterSheet, FilterSheetSection } from '../ui/filter-sheet';

type Props = {
  visible: boolean;
  presentation?: 'default' | 'premium';
  filters: InboxFilterDraft;
  sort: InboxSort;
  onCancel: () => void;
  onApply: (value: { filters: InboxFilterDraft; sort: InboxSort }) => void;
};

type SheetPage = 'main' | 'sort' | 'status';
type HeaderIconName = 'chevron-back' | 'close';

const SHEET_RADIUS = 34;
const HIDDEN_OFFSET = 720;
const FOOTER_CLEARANCE = 104;

const SORT_OPTIONS: { value: InboxSort; label: string; description: string }[] = [
  { value: 'latest_desc', label: 'Latest first', description: 'Newest conversations at the top' },
  { value: 'unread_desc', label: 'Unread first', description: 'Unread threads first, then latest' },
];

const FILTER_OPTIONS: { value: InboxFilter; label: string; description: string }[] = [
  { value: 'all', label: 'All conversations', description: 'Show every campaign thread' },
  { value: 'unread', label: 'Unread only', description: 'Only threads with unread messages' },
];

function selectedSortLabel(value: InboxSort) {
  return SORT_OPTIONS.find((option) => option.value === value)?.label ?? 'Latest first';
}

function selectedStatusLabel(value: InboxFilter) {
  return FILTER_OPTIONS.find((option) => option.value === value)?.label ?? 'All conversations';
}

function LiquidHeaderIconButton({
  icon,
  accessibilityLabel,
  onPress,
}: {
  icon: HeaderIconName;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const iconSize = icon === 'close' ? 23 : 21;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButtonPressable,
        pressed && styles.iconButtonPressablePressed,
      ]}
    >
      <View style={styles.iconButtonShell}>
        {isLiquidGlassAvailable() ? (
          <GlassView glassEffectStyle="regular" colorScheme="dark" style={styles.nativeIconButton}>
            <Ionicons name={icon} size={iconSize} color="#FFFFFF" />
          </GlassView>
        ) : (
          <>
            <BlurView
              tint="systemUltraThinMaterialDark"
              intensity={86}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.iconButtonTint} />
            <View style={styles.iconButtonTopHighlight} />
            <View style={styles.iconButtonBottomShade} />
            <View style={styles.iconButtonContent}>
              <Ionicons name={icon} size={iconSize} color="#FFFFFF" />
            </View>
          </>
        )}
      </View>
    </Pressable>
  );
}

export function InboxFilterSheet({
  visible,
  presentation = 'default',
  filters,
  sort,
  onCancel,
  onApply,
}: Props) {
  const [draftFilters, setDraftFilters] = useState(filters);
  const [draftSort, setDraftSort] = useState(sort);
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [page, setPage] = useState<SheetPage>('main');
  const translateY = useRef(new RNAnimated.Value(HIDDEN_OFFSET)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const pageOpacity = useRef(new RNAnimated.Value(1)).current;
  const pageTranslateX = useRef(new RNAnimated.Value(0)).current;
  const sheetHeight = Math.round(
    Math.min(window.height * 0.85, Math.max(window.height * 0.72, 600)),
  );

  useEffect(() => {
    if (!visible) return;
    setDraftFilters(filters);
    setDraftSort(sort);
  }, [filters, sort, visible]);

  useEffect(() => {
    if (presentation !== 'premium') return;

    if (visible) {
      setMounted(true);
      setPage('main');
      RNAnimated.parallel([
        RNAnimated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        RNAnimated.spring(translateY, {
          toValue: 0,
          speed: 22,
          bounciness: 4,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    RNAnimated.parallel([
      RNAnimated.timing(opacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      RNAnimated.timing(translateY, {
        toValue: HIDDEN_OFFSET,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [opacity, presentation, translateY, visible]);

  const activeCount =
    inboxActiveFilterCount(draftFilters) + (draftSort !== DEFAULT_INBOX_SORT ? 1 : 0);

  function navigate(nextPage: SheetPage) {
    RNAnimated.parallel([
      RNAnimated.timing(pageOpacity, {
        toValue: 0,
        duration: 90,
        useNativeDriver: true,
      }),
      RNAnimated.timing(pageTranslateX, {
        toValue: nextPage === 'main' ? 14 : -14,
        duration: 90,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPage(nextPage);
      pageTranslateX.setValue(nextPage === 'main' ? -10 : 10);
      RNAnimated.parallel([
        RNAnimated.timing(pageOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        RNAnimated.timing(pageTranslateX, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }

  if (presentation === 'premium') {
    if (!mounted) return null;

    const clearLabel = activeCount > 0 ? `Clear all (${activeCount})` : 'Clear all';
    const showLabel = 'Show messages';

    return (
      <Modal
        visible={mounted}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={onCancel}
      >
        <View style={styles.modalRoot}>
          <RNAnimated.View style={[StyleSheet.absoluteFill, { opacity }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close message filters"
              style={StyleSheet.absoluteFill}
              onPress={onCancel}
            >
              <BlurView
                intensity={Platform.OS === 'android' ? 16 : 26}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.scrim} />
            </Pressable>
          </RNAnimated.View>

          <RNAnimated.View
            style={[
              styles.sheetFrame,
              {
                height: sheetHeight,
                transform: [{ translateY }],
              },
            ]}
          >
            <BlurView tint="systemUltraThinMaterialDark" intensity={92} style={styles.surface}>
              <View style={styles.surfaceTint} />
              <View style={styles.handle} />

              <View style={styles.headerRow}>
                {page === 'main' ? (
                  <View style={styles.headerSide} />
                ) : (
                  <LiquidHeaderIconButton
                    icon="chevron-back"
                    accessibilityLabel="Back to filters"
                    onPress={() => {
                      navigate('main');
                    }}
                  />
                )}
                <Text style={styles.title} numberOfLines={1}>
                  Filter & Sort
                </Text>
                <LiquidHeaderIconButton
                  icon="close"
                  accessibilityLabel="Close message filters"
                  onPress={onCancel}
                />
              </View>

              <RNAnimated.View
                style={[
                  styles.pageWrap,
                  {
                    opacity: pageOpacity,
                    transform: [{ translateX: pageTranslateX }],
                  },
                ]}
              >
                {page === 'main' ? (
                  <ScrollView
                    style={styles.content}
                    contentContainerStyle={[styles.contentInner, styles.mainContentInner]}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.groupCard}>
                      <FilterNavigationRow
                        label="Sort"
                        value={selectedSortLabel(draftSort)}
                        onPress={() => {
                          navigate('sort');
                        }}
                      />
                      <View style={styles.divider} />
                      <FilterNavigationRow
                        label="Messages"
                        value={selectedStatusLabel(draftFilters.status)}
                        onPress={() => {
                          navigate('status');
                        }}
                      />
                    </View>
                  </ScrollView>
                ) : page === 'sort' ? (
                  <OptionPage
                    options={SORT_OPTIONS}
                    selected={draftSort}
                    onSelect={(value) => {
                      setDraftSort(value as InboxSort);
                    }}
                  />
                ) : (
                  <OptionPage
                    options={FILTER_OPTIONS}
                    selected={draftFilters.status}
                    onSelect={(value) => {
                      setDraftFilters({ status: value as InboxFilter });
                    }}
                  />
                )}
              </RNAnimated.View>

              <View
                style={[
                  styles.footer,
                  { paddingBottom: Math.max(insets.bottom, theme.spacing.sm) + theme.spacing.sm },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={clearLabel}
                  disabled={activeCount === 0}
                  onPress={() => {
                    setDraftFilters(DEFAULT_INBOX_FILTERS);
                    setDraftSort(DEFAULT_INBOX_SORT);
                  }}
                  style={({ pressed }) => [
                    styles.clearButton,
                    pressed && activeCount > 0 && styles.buttonPressed,
                    activeCount === 0 && styles.disabled,
                  ]}
                >
                  <Text style={styles.clearText}>{clearLabel}</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showLabel}
                  onPress={() => {
                    onApply({ filters: draftFilters, sort: draftSort });
                  }}
                  style={({ pressed }) => [styles.showButton, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.showText}>{showLabel}</Text>
                </Pressable>
              </View>
            </BlurView>
          </RNAnimated.View>
        </View>
      </Modal>
    );
  }

  return (
    <FilterSheet
      visible={visible}
      title="Filter messages"
      activeCount={activeCount}
      onCancel={onCancel}
      onClear={() => {
        setDraftFilters(DEFAULT_INBOX_FILTERS);
        setDraftSort(DEFAULT_INBOX_SORT);
      }}
      onApply={() => {
        onApply({ filters: draftFilters, sort: draftSort });
      }}
    >
      <FilterSheetSection title="Sort by">
        {SORT_OPTIONS.map((option) => (
          <FilterOption
            key={option.value}
            label={option.label}
            description={option.description}
            selected={draftSort === option.value}
            onPress={() => {
              setDraftSort(option.value);
            }}
          />
        ))}
      </FilterSheetSection>

      <FilterSheetSection title="Messages">
        {FILTER_OPTIONS.map((option) => (
          <FilterOption
            key={option.value}
            label={option.label}
            description={option.description}
            selected={draftFilters.status === option.value}
            onPress={() => {
              setDraftFilters({ status: option.value });
            }}
          />
        ))}
      </FilterSheetSection>
    </FilterSheet>
  );
}

function FilterNavigationRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => [styles.navigationRow, pressed && styles.pressed]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValueWrap}>
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
        <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.62)" />
      </View>
    </Pressable>
  );
}

function OptionPage({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string; description?: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.contentInner}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.groupCard}>
        {options.map((option, index) => {
          const isSelected = option.value === selected;
          return (
            <View key={option.value}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onSelect(option.value);
                }}
                style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
              >
                <View style={styles.optionCopy}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  {option.description ? (
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  ) : null}
                </View>
                <View style={[styles.optionCircle, isSelected && styles.optionCircleSelected]}>
                  {isSelected ? <Ionicons name="checkmark" size={14} color="#050509" /> : null}
                </View>
              </Pressable>
              {index < options.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.64)',
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
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(9,9,14,0.9)',
  },
  surfaceTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,7,12,0.78)',
  },
  handle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    marginTop: theme.spacing.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerRow: {
    minHeight: 64,
    paddingHorizontal: theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSide: {
    width: 44,
    height: 44,
  },
  iconButtonPressable: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  iconButtonPressablePressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  iconButtonShell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 5,
  },
  nativeIconButton: {
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.075)',
  },
  iconButtonTopHighlight: {
    position: 'absolute',
    top: 1,
    left: 5,
    right: 5,
    height: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  iconButtonBottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 22,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  iconButtonContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: 0,
    includeFontPadding: false,
  },
  pageWrap: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  mainContentInner: {
    paddingBottom: FOOTER_CLEARANCE,
  },
  groupCard: {
    overflow: 'hidden',
    borderRadius: 26,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  navigationRow: {
    minHeight: 58,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  rowLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: 0,
  },
  rowValueWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.xs,
  },
  rowValue: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    letterSpacing: 0,
    flexShrink: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: theme.spacing.lg,
    marginRight: theme.spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  optionRow: {
    minHeight: 62,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  optionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  optionLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0,
  },
  optionDescription: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  optionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  optionCircleSelected: {
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  clearButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  showButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  clearText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  showText: {
    color: '#050509',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
  buttonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.38,
  },
});
