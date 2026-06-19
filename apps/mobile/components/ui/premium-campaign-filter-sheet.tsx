import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppInput } from '@/components/ui/app-input';
import { LiquidModalBackdrop, LiquidSheetSurface } from '@/components/ui/liquid-sheet-surface';
import type {
  CampaignFilterDraft,
  CampaignSort,
  CampaignStatusFilter,
} from '@/lib/filters/campaigns';
import { roundedCampaignAmountMax } from '@/lib/filters/campaigns';
import {
  creatorFilterError,
  DEFAULT_CREATOR_FILTERS,
  type CreatorFilterDraft,
  type CreatorSort,
} from '@/lib/filters/creators';
import { type DeckFilterSheetRenderInput, type DeckSortOption } from './deck-browse-screen';

type Props = DeckFilterSheetRenderInput<CampaignSort, CampaignFilterDraft> & {
  amountBounds: {
    min: number;
    max: number;
  };
};

type CreatorProps = DeckFilterSheetRenderInput<CreatorSort, CreatorFilterDraft> & {
  priceBounds: {
    min: number;
    max: number;
  };
};

type SheetPage = 'main' | 'sort' | 'status';

type StatusOption = {
  value: CampaignStatusFilter;
  label: string;
  description: string;
};

type FollowerOption = {
  value: string;
  label: string;
  description: string;
  min: string;
};

const SHEET_RADIUS = 34;
const HIDDEN_OFFSET = 720;
const FOOTER_CLEARANCE = 104;
const STATUS_OPTIONS: StatusOption[] = [
  { value: 'all', label: 'All campaigns', description: 'Every campaign state' },
  { value: 'active', label: 'Active work', description: 'Requests, escrow, and delivery stages' },
  { value: 'completed', label: 'Completed', description: 'Finished campaigns only' },
  {
    value: 'attention',
    label: 'Needs attention',
    description: 'Disputed, declined, expired, or refunded',
  },
];
const FOLLOWER_OPTIONS: FollowerOption[] = [
  { value: 'all', label: 'Any audience', description: 'Show every creator', min: '' },
  { value: '10k', label: '10K+ followers', description: 'Growing creators', min: '10000' },
  { value: '50k', label: '50K+ followers', description: 'Established reach', min: '50000' },
  { value: '100k', label: '100K+ followers', description: 'Large audience', min: '100000' },
  { value: '500k', label: '500K+ followers', description: 'Premium creators', min: '500000' },
  { value: '1m', label: '1M+ followers', description: 'Top-tier reach', min: '1000000' },
];

type HeaderIconName = 'chevron-back' | 'close';

function parseAmount(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampAmount(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatAmount(value: number) {
  return String(Math.round(value));
}

function formatCompactNumber(value: number) {
  return Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

function selectedSortLabel<TSort extends string>(options: DeckSortOption<TSort>[], value: TSort) {
  return options.find((option) => option.value === value)?.label ?? 'Newest first';
}

function selectedStatusLabel(value: CampaignStatusFilter) {
  return STATUS_OPTIONS.find((option) => option.value === value)?.label ?? 'All campaigns';
}

function selectedFollowerLabel(filters: CreatorFilterDraft) {
  const min = filters.followers.min.trim();
  const max = filters.followers.max.trim();
  if (!min && !max) return FOLLOWER_OPTIONS[0].label;
  const matching = FOLLOWER_OPTIONS.find((option) => option.min === min && !max);
  if (matching) return matching.label;

  const parsedMin = Number(min);
  const parsedMax = Number(max);
  if (Number.isFinite(parsedMin) && !max) return `${formatCompactNumber(parsedMin)}+`;
  if (Number.isFinite(parsedMin) && Number.isFinite(parsedMax)) {
    return `${formatCompactNumber(parsedMin)}-${formatCompactNumber(parsedMax)}`;
  }
  return 'Custom audience';
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

export function PremiumCampaignFilterSheet({
  visible,
  activeCount,
  resultCount,
  sortOptions,
  draftSort,
  setDraftSort,
  draftFilters,
  setDraftFilters,
  applyDisabled,
  applyError,
  onCancel,
  onClear,
  onApply,
  amountBounds,
}: Props) {
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

  const rangeBounds = useMemo(
    () => ({
      min: Math.max(0, amountBounds.min),
      max: Math.max(1000, roundedCampaignAmountMax(amountBounds.max)),
    }),
    [amountBounds.max, amountBounds.min],
  );

  useEffect(() => {
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
  }, [opacity, translateY, visible]);

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

  if (!mounted) return null;

  const clearLabel = activeCount > 0 ? `Clear all (${activeCount})` : 'Clear all';
  const showLabel = `Show ${resultCount}`;
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
            accessibilityLabel="Close campaign filters"
            style={StyleSheet.absoluteFill}
            onPress={onCancel}
          >
            <LiquidModalBackdrop />
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
          <LiquidSheetSurface style={styles.surface}>
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
                accessibilityLabel="Close campaign filters"
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
                <MainFilterPage
                  sortLabel={selectedSortLabel(sortOptions, draftSort)}
                  statusLabel={selectedStatusLabel(draftFilters.status)}
                  filters={draftFilters}
                  rangeBounds={rangeBounds}
                  applyError={applyError}
                  onOpenSort={() => {
                    navigate('sort');
                  }}
                  onOpenStatus={() => {
                    navigate('status');
                  }}
                  onMinChange={(value) => {
                    setDraftFilters({
                      ...draftFilters,
                      amount: { ...draftFilters.amount, min: value },
                    });
                  }}
                  onMaxChange={(value) => {
                    setDraftFilters({
                      ...draftFilters,
                      amount: { ...draftFilters.amount, max: value },
                    });
                  }}
                />
              ) : page === 'sort' ? (
                <OptionPage
                  options={sortOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  selected={draftSort}
                  onSelect={(value) => {
                    setDraftSort(value as CampaignSort);
                  }}
                />
              ) : (
                <OptionPage
                  options={STATUS_OPTIONS}
                  selected={draftFilters.status}
                  onSelect={(value) => {
                    setDraftFilters({
                      ...draftFilters,
                      status: value as CampaignStatusFilter,
                    });
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
                disabled={applyDisabled}
                onPress={onApply}
                style={({ pressed }) => [
                  styles.showButton,
                  pressed && !applyDisabled && styles.buttonPressed,
                  applyDisabled && styles.disabled,
                ]}
              >
                <Text style={styles.showText}>{showLabel}</Text>
              </Pressable>
            </View>
          </LiquidSheetSurface>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

export function PremiumCreatorFilterSheet({
  visible,
  activeCount,
  resultCount,
  sortOptions,
  draftSort,
  setDraftSort,
  draftFilters,
  setDraftFilters,
  applyDisabled,
  applyError,
  onCancel,
  onClear,
  onApply,
  priceBounds,
}: CreatorProps) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [page, setPage] = useState<'main' | 'sort' | 'followers'>('main');
  const translateY = useRef(new RNAnimated.Value(HIDDEN_OFFSET)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const pageOpacity = useRef(new RNAnimated.Value(1)).current;
  const pageTranslateX = useRef(new RNAnimated.Value(0)).current;
  const sheetHeight = Math.round(
    Math.min(window.height * 0.85, Math.max(window.height * 0.72, 600)),
  );

  const normalizedPriceBounds = useMemo(
    () => ({
      min: Math.max(0, priceBounds.min),
      max: Math.max(1000, roundedCampaignAmountMax(priceBounds.max)),
    }),
    [priceBounds.max, priceBounds.min],
  );

  useEffect(() => {
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
  }, [opacity, translateY, visible]);

  function navigate(nextPage: 'main' | 'sort' | 'followers') {
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

  if (!mounted) return null;

  const priceError = creatorFilterError({
    ...draftFilters,
    followers: DEFAULT_CREATOR_FILTERS.followers,
  });
  const clearLabel = activeCount > 0 ? `Clear all (${activeCount})` : 'Clear all';
  const showLabel = `Show ${resultCount}`;
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
            accessibilityLabel="Close creator filters"
            style={StyleSheet.absoluteFill}
            onPress={onCancel}
          >
            <LiquidModalBackdrop />
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
          <LiquidSheetSurface style={styles.surface}>
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
                accessibilityLabel="Close creator filters"
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
                <CreatorMainFilterPage
                  sortLabel={selectedSortLabel(sortOptions, draftSort)}
                  followerLabel={selectedFollowerLabel(draftFilters)}
                  filters={draftFilters}
                  priceBounds={normalizedPriceBounds}
                  priceError={priceError ?? applyError}
                  onOpenSort={() => {
                    navigate('sort');
                  }}
                  onOpenFollowers={() => {
                    navigate('followers');
                  }}
                  onPriceMinChange={(value) => {
                    setDraftFilters({
                      ...draftFilters,
                      price: { ...draftFilters.price, min: value },
                    });
                  }}
                  onPriceMaxChange={(value) => {
                    setDraftFilters({
                      ...draftFilters,
                      price: { ...draftFilters.price, max: value },
                    });
                  }}
                />
              ) : page === 'sort' ? (
                <OptionPage
                  options={sortOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  selected={draftSort}
                  onSelect={(value) => {
                    setDraftSort(value as CreatorSort);
                  }}
                />
              ) : (
                <OptionPage
                  options={FOLLOWER_OPTIONS}
                  selected={
                    FOLLOWER_OPTIONS.find(
                      (option) =>
                        option.min === draftFilters.followers.min.trim() &&
                        !draftFilters.followers.max.trim(),
                    )?.value ?? 'custom'
                  }
                  onSelect={(value) => {
                    const option = FOLLOWER_OPTIONS.find((item) => item.value === value);
                    if (!option) return;
                    setDraftFilters({
                      ...draftFilters,
                      followers: { min: option.min, max: '' },
                    });
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
                disabled={applyDisabled}
                onPress={onApply}
                style={({ pressed }) => [
                  styles.showButton,
                  pressed && !applyDisabled && styles.buttonPressed,
                  applyDisabled && styles.disabled,
                ]}
              >
                <Text style={styles.showText}>{showLabel}</Text>
              </Pressable>
            </View>
          </LiquidSheetSurface>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

function MainFilterPage({
  sortLabel,
  statusLabel,
  filters,
  rangeBounds,
  applyError,
  onOpenSort,
  onOpenStatus,
  onMinChange,
  onMaxChange,
}: {
  sortLabel: string;
  statusLabel: string;
  filters: CampaignFilterDraft;
  rangeBounds: { min: number; max: number };
  applyError: string | null;
  onOpenSort: () => void;
  onOpenStatus: () => void;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}) {
  return (
    <View style={[styles.content, styles.contentInner]}>
      <View style={styles.groupCard}>
        <FilterNavigationRow label="Sort" value={sortLabel} onPress={onOpenSort} />
        <View style={styles.divider} />
        <FilterNavigationRow label="Status" value={statusLabel} onPress={onOpenStatus} />
      </View>

      <View style={styles.rangeCard}>
        <Text style={styles.cardTitle}>Campaign amount</Text>
        <RangeSlider
          minBound={rangeBounds.min}
          maxBound={rangeBounds.max}
          minValue={filters.amount.min}
          maxValue={filters.amount.max}
          onMinChange={onMinChange}
          onMaxChange={onMaxChange}
        />
        <View style={styles.amountInputRow}>
          <AmountInput
            label="Minimum campaign amount"
            value={filters.amount.min}
            placeholder="Min"
            prefix="₹"
            onChangeText={onMinChange}
          />
          <Text style={styles.amountSeparator}>-</Text>
          <AmountInput
            label="Maximum campaign amount"
            value={filters.amount.max}
            placeholder="Max"
            prefix="₹"
            onChangeText={onMaxChange}
          />
        </View>
        {applyError ? <Text style={styles.errorText}>{applyError}</Text> : null}
      </View>
    </View>
  );
}

function CreatorMainFilterPage({
  sortLabel,
  followerLabel,
  filters,
  priceBounds,
  priceError,
  onOpenSort,
  onOpenFollowers,
  onPriceMinChange,
  onPriceMaxChange,
}: {
  sortLabel: string;
  followerLabel: string;
  filters: CreatorFilterDraft;
  priceBounds: { min: number; max: number };
  priceError: string | null;
  onOpenSort: () => void;
  onOpenFollowers: () => void;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
}) {
  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={[styles.contentInner, styles.mainContentInner]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.groupCard}>
        <FilterNavigationRow label="Sort" value={sortLabel} onPress={onOpenSort} />
        <View style={styles.divider} />
        <FilterNavigationRow label="Followers" value={followerLabel} onPress={onOpenFollowers} />
      </View>

      <View style={styles.rangeCard}>
        <Text style={styles.cardTitle}>Starting price</Text>
        <RangeSlider
          minBound={priceBounds.min}
          maxBound={priceBounds.max}
          minValue={filters.price.min}
          maxValue={filters.price.max}
          valuePrefix="₹"
          onMinChange={onPriceMinChange}
          onMaxChange={onPriceMaxChange}
        />
        <View style={styles.amountInputRow}>
          <AmountInput
            label="Minimum starting price"
            value={filters.price.min}
            placeholder="Min"
            prefix="₹"
            onChangeText={onPriceMinChange}
          />
          <Text style={styles.amountSeparator}>-</Text>
          <AmountInput
            label="Maximum starting price"
            value={filters.price.max}
            placeholder="Max"
            prefix="₹"
            onChangeText={onPriceMaxChange}
          />
        </View>
        {priceError ? <Text style={styles.errorText}>{priceError}</Text> : null}
      </View>
    </ScrollView>
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

function AmountInput({
  label,
  value,
  placeholder,
  prefix,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  prefix: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <AppInput
      size="sm"
      containerStyle={styles.amountInputContainer}
      accessibilityLabel={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.36)"
      keyboardType="numeric"
      inputMode="numeric"
      prefix={prefix ? <Text style={styles.currencyPrefix}>{prefix}</Text> : undefined}
      inputStyle={styles.amountInputText}
    />
  );
}

function RangeDensityGraph({
  clipStyle,
  contentStyle,
}: {
  clipStyle: AnimatedStyle<ViewStyle>;
  contentStyle: AnimatedStyle<ViewStyle>;
}) {
  return (
    <Animated.View pointerEvents="none" style={[styles.rangeGraphClip, clipStyle]}>
      <Animated.View style={[styles.rangeGraphContent, contentStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 320 76" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="rangeGraphFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.28" />
              <Stop offset="0.45" stopColor="#F28EAF" stopOpacity="0.16" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="rangeGraphStroke" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
              <Stop offset="0.28" stopColor="#FFFFFF" stopOpacity="0.4" />
              <Stop offset="0.62" stopColor="#F28EAF" stopOpacity="0.34" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path
            d="M0 68 C28 67 38 62 56 50 C82 32 104 13 132 23 C156 31 166 48 192 50 C222 52 236 32 260 36 C284 40 294 58 320 63 L320 76 L0 76 Z"
            fill="url(#rangeGraphFill)"
          />
          <Path
            d="M0 68 C28 67 38 62 56 50 C82 32 104 13 132 23 C156 31 166 48 192 50 C222 52 236 32 260 36 C284 40 294 58 320 63"
            fill="none"
            stroke="url(#rangeGraphStroke)"
            strokeWidth="2"
          />
        </Svg>
      </Animated.View>
    </Animated.View>
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

function RangeSlider({
  minBound,
  maxBound,
  minValue,
  maxValue,
  valuePrefix = '₹',
  onMinChange,
  onMaxChange,
}: {
  minBound: number;
  maxBound: number;
  minValue: string;
  maxValue: string;
  valuePrefix?: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const minX = useSharedValue(0);
  const maxX = useSharedValue(0);
  const startMinX = useSharedValue(0);
  const startMaxX = useSharedValue(0);
  const usableMax = Math.max(maxBound, minBound + 1);

  useEffect(() => {
    const amountToX = (value: number) => {
      if (trackWidth <= 0) return 0;
      const ratio = (clampAmount(value, minBound, usableMax) - minBound) / (usableMax - minBound);
      return ratio * trackWidth;
    };
    const parsedMin = parseAmount(minValue, minBound);
    const parsedMax = parseAmount(maxValue, usableMax);
    minX.value = withTiming(amountToX(Math.min(parsedMin, parsedMax)), { duration: 140 });
    maxX.value = withTiming(amountToX(Math.max(parsedMin, parsedMax)), { duration: 140 });
  }, [maxValue, minBound, minValue, trackWidth, usableMax, minX, maxX]);

  const selectedStyle = useAnimatedStyle(() => ({
    left: minX.value,
    width: Math.max(0, maxX.value - minX.value),
  }));

  const graphClipStyle = useAnimatedStyle<ViewStyle>(() => ({
    left: minX.value,
    width: Math.max(0, maxX.value - minX.value),
  }));

  const graphContentStyle = useAnimatedStyle<ViewStyle>(() => ({
    width: Math.max(1, trackWidth + 36),
    transform: [{ translateX: -minX.value - 18 }],
  }));

  const minThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: minX.value - 18 }],
  }));

  const maxThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: maxX.value - 18 }],
  }));

  const minGesture = Gesture.Pan()
    .hitSlop({ left: 12, right: 12, top: 12, bottom: 12 })
    .onBegin(() => {
      startMinX.value = minX.value;
    })
    .onUpdate((event) => {
      const next = Math.min(Math.max(startMinX.value + event.translationX, 0), maxX.value);
      minX.value = next;
      const ratio = trackWidth <= 0 ? 0 : next / trackWidth;
      const amount = minBound + ratio * (usableMax - minBound);
      runOnJS(onMinChange)(`${Math.round(amount)}`);
    });

  const maxGesture = Gesture.Pan()
    .hitSlop({ left: 12, right: 12, top: 12, bottom: 12 })
    .onBegin(() => {
      startMaxX.value = maxX.value;
    })
    .onUpdate((event) => {
      const next = Math.min(Math.max(startMaxX.value + event.translationX, minX.value), trackWidth);
      maxX.value = next;
      const ratio = trackWidth <= 0 ? 0 : next / trackWidth;
      const amount = minBound + ratio * (usableMax - minBound);
      runOnJS(onMaxChange)(`${Math.round(amount)}`);
    });

  function handleLayout(event: LayoutChangeEvent) {
    setTrackWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={styles.rangeShell}>
      <View style={styles.rangeTrackWrap} onLayout={handleLayout}>
        <RangeDensityGraph clipStyle={graphClipStyle} contentStyle={graphContentStyle} />
        <View style={styles.rangeRailLayer}>
          <View style={styles.rangeTrack} />
          <Animated.View style={[styles.rangeSelectedTrack, selectedStyle]} />
        </View>
        <GestureDetector gesture={minGesture}>
          <Animated.View style={[styles.rangeThumb, minThumbStyle]} />
        </GestureDetector>
        <GestureDetector gesture={maxGesture}>
          <Animated.View style={[styles.rangeThumb, maxThumbStyle]} />
        </GestureDetector>
      </View>
      <View style={styles.rangeScaleRow}>
        <Text style={styles.rangeScaleText}>
          {valuePrefix}
          {formatAmount(minBound)}
        </Text>
        <Text style={styles.rangeScaleText}>
          {valuePrefix}
          {formatAmount(usableMax)}
        </Text>
      </View>
    </View>
  );
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
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
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
    ...theme.typography.section,
    color: '#FFFFFF',
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
    ...theme.typography.bodyStrong,
    color: '#FFFFFF',
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
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.62)',
    fontWeight: '600',
    flexShrink: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: theme.spacing.lg,
    marginRight: theme.spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  rangeCard: {
    borderRadius: 26,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  cardTitle: {
    ...theme.typography.bodyStrong,
    color: '#FFFFFF',
  },
  rangeShell: {
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  rangeTrackWrap: {
    height: 96,
    marginHorizontal: 18,
  },
  rangeGraphClip: {
    position: 'absolute',
    top: 0,
    height: 76,
    overflow: 'hidden',
    opacity: 0.95,
  },
  rangeGraphContent: {
    height: 76,
  },
  rangeRailLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 21,
    height: 4,
    justifyContent: 'center',
  },
  rangeTrack: {
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  rangeSelectedTrack: {
    position: 'absolute',
    height: 4,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  rangeThumb: {
    position: 'absolute',
    top: 54,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(12,12,16,0.98)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  rangeScaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rangeScaleText: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.45)',
    fontVariant: ['tabular-nums'],
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  amountInputContainer: {
    flex: 1,
  },
  currencyPrefix: {
    ...theme.typography.callout,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  amountInputText: {
    ...theme.typography.mono,
  },
  amountSeparator: {
    ...theme.typography.cardTitle,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '800',
  },
  errorText: {
    ...theme.typography.label,
    color: theme.colors.danger,
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
    ...theme.typography.callout,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  optionDescription: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.48)',
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
    ...theme.typography.bodyStrong,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  showText: {
    ...theme.typography.bodyStrong,
    color: '#050509',
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
