import { theme } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const SHEET_RADIUS = 34;
export const HIDDEN_OFFSET = 720;
export const FOOTER_CLEARANCE = 104;

/** Shared stylesheet for the premium inbox filter sheet and its subcomponents. */
export const filterSheetStyles = StyleSheet.create({
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
