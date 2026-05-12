import { Platform } from 'react-native';

/**
 * App-wide font families aligned with Apple’s SF stack on iOS.
 * SF Pro is not bundled for Android/web — we use generic sans / monospace there.
 */
export const fontDisplay = Platform.select({
  ios: 'SF Pro Display',
  android: 'sans-serif',
  default: 'system-ui',
});

export const fontBody = Platform.select({
  ios: 'SF Pro Text',
  android: 'sans-serif',
  default: 'system-ui',
});

export const fontMono = Platform.select({
  ios: 'SF Mono',
  android: 'monospace',
  default: 'monospace',
});
