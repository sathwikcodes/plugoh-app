import { theme } from '@/constants/theme';
import type { TextStyle } from 'react-native';

export const authTypography = {
  displayLg: {
    ...theme.typography.display,
  } satisfies TextStyle,
  displayMd: {
    ...theme.typography.title,
  } satisfies TextStyle,
  displaySm: {
    ...theme.typography.headline,
  } satisfies TextStyle,
  section: {
    ...theme.typography.section,
  } satisfies TextStyle,
  cardTitle: {
    ...theme.typography.cardTitle,
  } satisfies TextStyle,
  body: {
    ...theme.typography.body,
  } satisfies TextStyle,
  bodyStrong: {
    ...theme.typography.bodyStrong,
  } satisfies TextStyle,
  callout: {
    ...theme.typography.callout,
  } satisfies TextStyle,
  caption: {
    ...theme.typography.caption,
  } satisfies TextStyle,
  labelUpper: {
    ...theme.typography.label,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  fine: {
    ...theme.typography.caption,
  } satisfies TextStyle,
  mono: {
    ...theme.typography.mono,
  } satisfies TextStyle,
};
