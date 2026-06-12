import type { NativeTabsProps } from 'expo-router/unstable-native-tabs';
import { DynamicColorIOS, Platform, type ColorValue } from 'react-native';

function tabColor(dark: ColorValue, light: ColorValue) {
  return Platform.OS === 'ios' ? DynamicColorIOS({ dark, light }) : dark;
}

export const NATIVE_TAB_SELECTED = tabColor('#FFFFFF', '#FFFFFF');
export const NATIVE_TAB_DEFAULT = tabColor('rgba(255, 255, 255, 0.58)', 'rgba(15, 23, 42, 0.58)');

const TAB_LABEL_STYLE = {
  fontSize: 10,
};

export const plugohNativeTabOptions = {
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
  | 'blurEffect'
  | 'disableTransparentOnScrollEdge'
  | 'iconColor'
  | 'labelStyle'
  | 'labelVisibilityMode'
  | 'minimizeBehavior'
  | 'shadowColor'
  | 'titlePositionAdjustment'
>;
