import type { FontSource } from 'expo-font';
import archivoBold from '../assets/fonts/Archivo-Bold.otf';
import archivoMedium from '../assets/fonts/Archivo-Medium.otf';
import archivoRegular from '../assets/fonts/Archivo-Regular.otf';
import archivoSemiBold from '../assets/fonts/Archivo-SemiBold.otf';
import clashDisplayBold from '../assets/fonts/ClashDisplay-Bold.otf';
import clashDisplaySemibold from '../assets/fonts/ClashDisplay-Semibold.otf';
import {
  fontBody,
  fontBodyBold,
  fontBodyMedium,
  fontBodyStrong,
  fontDisplay,
  fontDisplayStrong,
} from './app-fonts';

export const appFontAssets = {
  [fontDisplay]: clashDisplaySemibold,
  [fontDisplayStrong]: clashDisplayBold,
  [fontBody]: archivoRegular,
  [fontBodyMedium]: archivoMedium,
  [fontBodyStrong]: archivoSemiBold,
  [fontBodyBold]: archivoBold,
} satisfies Record<string, FontSource>;
