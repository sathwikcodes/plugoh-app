import { fontBody, fontDisplay, fontMono } from '@/constants/app-fonts';
import { TextStyle } from 'react-native';

const displayTracking = (size: number) => -(size * 0.06);

export const authTypography = {
  displayLg: {
    fontFamily: fontDisplay,
    fontWeight: '700',
    letterSpacing: displayTracking(32),
  } satisfies TextStyle,
  displayMd: {
    fontFamily: fontDisplay,
    fontWeight: '700',
    letterSpacing: displayTracking(26),
  } satisfies TextStyle,
  displaySm: {
    fontFamily: fontDisplay,
    fontWeight: '700',
    letterSpacing: displayTracking(22),
  } satisfies TextStyle,
  body: {
    fontFamily: fontBody,
    fontWeight: '400',
  } satisfies TextStyle,
  bodyStrong: {
    fontFamily: fontBody,
    fontWeight: '600',
  } satisfies TextStyle,
  labelUpper: {
    fontFamily: fontBody,
    fontWeight: '600',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  fine: {
    fontFamily: fontBody,
    fontWeight: '400',
  } satisfies TextStyle,
  mono: {
    fontFamily: fontMono,
    fontWeight: '600',
  } satisfies TextStyle,
};
