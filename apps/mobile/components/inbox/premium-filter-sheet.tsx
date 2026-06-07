import { FilterNavigationRow } from '@/components/inbox/filter-sheet/filter-navigation-row';
import { FilterOptionPage } from '@/components/inbox/filter-sheet/filter-option-page';
import { LiquidHeaderIconButton } from '@/components/inbox/filter-sheet/liquid-header-icon-button';
import { filterSheetStyles as styles } from '@/components/inbox/filter-sheet/styles';
import { theme } from '@/constants/theme';
import { useFilterSheetAnimation } from '@/hooks/use-filter-sheet-animation';
import type { InboxFilter, InboxFilterDraft, InboxSort } from '@/lib/filters/inbox';
import {
  FILTER_OPTIONS,
  SORT_OPTIONS,
  selectedSortLabel,
  selectedStatusLabel,
} from '@/lib/inbox/filter-options';
import { BlurView } from 'expo-blur';
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

type Props = {
  visible: boolean;
  draftFilters: InboxFilterDraft;
  draftSort: InboxSort;
  activeCount: number;
  onCancel: () => void;
  onApply: () => void;
  onClear: () => void;
  onSelectSort: (value: InboxSort) => void;
  onSelectStatus: (value: InboxFilter) => void;
};

/** Custom liquid-glass bottom sheet with a drill-in sort/status page transition. */
export function PremiumFilterSheet({
  visible,
  draftFilters,
  draftSort,
  activeCount,
  onCancel,
  onApply,
  onClear,
  onSelectSort,
  onSelectStatus,
}: Props) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const { mounted, page, navigate, translateY, opacity, pageOpacity, pageTranslateX } =
    useFilterSheetAnimation({ visible, enabled: true });

  const sheetHeight = Math.round(
    Math.min(window.height * 0.85, Math.max(window.height * 0.72, 600)),
  );

  if (!mounted) return null;

  const clearLabel = activeCount > 0 ? `Clear all (${activeCount})` : 'Clear all';
  const showLabel = 'Show';

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
          style={[styles.sheetFrame, { height: sheetHeight, transform: [{ translateY }] }]}
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
                { opacity: pageOpacity, transform: [{ translateX: pageTranslateX }] },
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
                <FilterOptionPage
                  options={SORT_OPTIONS}
                  selected={draftSort}
                  onSelect={(value) => {
                    onSelectSort(value as InboxSort);
                  }}
                />
              ) : (
                <FilterOptionPage
                  options={FILTER_OPTIONS}
                  selected={draftFilters.status}
                  onSelect={(value) => {
                    onSelectStatus(value as InboxFilter);
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
                onPress={onClear}
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
                onPress={onApply}
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
