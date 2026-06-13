import { Text, TextInput, type TextStyle } from 'react-native';

export const fontDisplay = 'ClashDisplay-Semibold';
export const fontDisplayStrong = 'ClashDisplay-Bold';
export const fontBody = 'Archivo-Regular';
export const fontBodyMedium = 'Archivo-Medium';
export const fontBodyStrong = 'Archivo-SemiBold';
export const fontBodyBold = 'Archivo-Bold';
export const fontMono = fontBodyStrong;

export const appFontFamilyNames = [
  fontDisplay,
  fontDisplayStrong,
  fontBody,
  fontBodyMedium,
  fontBodyStrong,
  fontBodyBold,
] as const;

type ComponentWithDefaultStyle = {
  defaultProps?: {
    style?: unknown;
  };
};

const globalFontStyle: TextStyle = {
  fontFamily: fontBody,
};

let globalTextFontDefaultsInstalled = false;

function applyDefaultFontStyle(Component: ComponentWithDefaultStyle) {
  const defaultProps = Component.defaultProps ?? {};
  const existingStyle = defaultProps.style;

  Component.defaultProps = {
    ...defaultProps,
    style: existingStyle ? [globalFontStyle, existingStyle] : globalFontStyle,
  };
}

export function installGlobalTextFontDefaults() {
  if (globalTextFontDefaultsInstalled) return;

  applyDefaultFontStyle(Text as unknown as ComponentWithDefaultStyle);
  applyDefaultFontStyle(TextInput as unknown as ComponentWithDefaultStyle);
  globalTextFontDefaultsInstalled = true;
}
