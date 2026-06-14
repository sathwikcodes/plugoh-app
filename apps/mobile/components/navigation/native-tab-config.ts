import type { NativeTabsProps } from 'expo-router/unstable-native-tabs';
import type { ColorValue } from 'react-native';
import { PREMIUM_MESH_CANVAS_HEX } from '@/constants/premium-mesh-canvas-hex.js';
import { theme } from '@/constants/theme';

/** App is dark-only; avoid light DynamicColorIOS fallbacks that wash tab chrome. */
export const NATIVE_TAB_SELECTED: ColorValue = '#FFFFFF';
export const NATIVE_TAB_DEFAULT: ColorValue = 'rgba(255, 255, 255, 0.58)';

/** Height of the floating native tab dock that overlays scroll content. */
export const NATIVE_TAB_DOCK_HEIGHT = 72;
/** Breathing room between the last scroll item and the tab dock. */
export const TAB_DOCK_GAP = theme.spacing.lg;

/**
 * Bottom padding a tab screen's scroll content needs so its last item clears the
 * floating native tab dock and the home-indicator safe area. Single source of truth.
 */
export function getTabScreenBottomPadding(insetBottom: number) {
  return Math.max(insetBottom, theme.spacing.sm) + NATIVE_TAB_DOCK_HEIGHT + TAB_DOCK_GAP;
}

const TAB_LABEL_STYLE = {
  fontSize: 10,
};

export const plugohNativeTabOptions = {
  backgroundColor: PREMIUM_MESH_CANVAS_HEX.deep,
  blurEffect: 'systemChromeMaterialDark',
  disableTransparentOnScrollEdge: true,
  minimizeBehavior: 'never',
  iconColor: {
    default: NATIVE_TAB_DEFAULT,
    selected: NATIVE_TAB_SELECTED,
  },
  labelStyle: {
    default: { ...TAB_LABEL_STYLE, color: NATIVE_TAB_DEFAULT },
    selected: { ...TAB_LABEL_STYLE, color: NATIVE_TAB_SELECTED },
  },
  labelVisibilityMode: 'labeled',
  shadowColor: 'rgba(255, 255, 255, 0.12)',
  titlePositionAdjustment: {
    vertical: 0,
  },
} satisfies Pick<
  NativeTabsProps,
  | 'backgroundColor'
  | 'blurEffect'
  | 'disableTransparentOnScrollEdge'
  | 'iconColor'
  | 'labelStyle'
  | 'labelVisibilityMode'
  | 'minimizeBehavior'
  | 'shadowColor'
  | 'titlePositionAdjustment'
>;
