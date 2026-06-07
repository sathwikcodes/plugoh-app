import { BrandAvatar } from '@/components/inbox/brand-avatar';
import { LiquidGlassShell } from '@/components/inbox/liquid-glass-shell';
import { GlassCircleButton } from '@/components/ui/glass-circle-button';
import { ShimmerText } from '@/components/ui/shimmer';
import { theme } from '@/constants/theme';
import { useMemo } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const IDENTITY_AVATAR_SIZE = 24;
const IDENTITY_AVATAR_RADIUS = IDENTITY_AVATAR_SIZE / 2;
const IDENTITY_PILL_MIN_HEIGHT = 44;
const IDENTITY_PILL_CORNER_RADIUS = IDENTITY_PILL_MIN_HEIGHT / 2;
const IDENTITY_AVATAR_FLOAT_LEFT = theme.spacing.sm + 2;
const IDENTITY_NAME_LEADING_RESERVE =
  IDENTITY_AVATAR_FLOAT_LEFT + IDENTITY_AVATAR_SIZE + theme.spacing.sm;

type Props = {
  displayName: string;
  avatarUri: string | null;
  initialsSource: string | null;
  loading: boolean;
  topInset: number;
  onBack: () => void;
  onInfo: () => void;
  onHeightChange: (height: number) => void;
};

/** Floating glass controls over the message list — back, counterparty pill, info. */
export function ChatThreadHeader({
  displayName,
  avatarUri,
  initialsSource,
  loading,
  topInset,
  onBack,
  onInfo,
  onHeightChange,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const nameMaxWidth = useMemo(() => {
    const rowInner = windowWidth - theme.spacing.lg * 2;
    const headerIcon = 38;
    const startWidth = rowInner - theme.spacing.sm - headerIcon;
    const pillMax = Math.min(rowInner * 0.5, startWidth - headerIcon - theme.spacing.sm);
    return Math.max(72, pillMax - IDENTITY_NAME_LEADING_RESERVE - theme.spacing.md);
  }, [windowWidth]);

  return (
    <View
      pointerEvents="box-none"
      style={styles.floatingHeader}
      onLayout={(e) => {
        onHeightChange(e.nativeEvent.layout.height);
      }}
    >
      <View style={[styles.row, { paddingTop: topInset + theme.spacing.sm }]}>
        <View style={styles.start}>
          <View style={styles.shadow}>
            <GlassCircleButton
              symbol="chevron.left"
              fallbackIcon="chevron-back"
              tintColor="#FFFFFF"
              size={44}
              symbolSize={20}
              accessibilityLabel="Go back"
              onPress={onBack}
            />
          </View>

          <View style={[styles.shadow, styles.pillShadow]}>
            <View style={styles.pillOuter}>
              <LiquidGlassShell style={styles.pillShell}>
                <View style={styles.pillInner}>
                  <View style={styles.nameLeadingSpacer} />
                  <View style={styles.nameWrap}>
                    {loading ? (
                      <ShimmerText width={nameMaxWidth * 0.72} height={16} />
                    ) : (
                      <Text
                        style={[styles.name, { maxWidth: nameMaxWidth }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {displayName}
                      </Text>
                    )}
                  </View>
                </View>
              </LiquidGlassShell>
              <View style={styles.avatarFloating} pointerEvents="none">
                <BrandAvatar
                  imageUri={avatarUri}
                  name={initialsSource}
                  size={IDENTITY_AVATAR_SIZE}
                  textSize={11}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.shadow}>
          <GlassCircleButton
            symbol="info.circle"
            fallbackIcon="information-circle"
            tintColor="#FFFFFF"
            size={44}
            symbolSize={20}
            accessibilityLabel="Thread info"
            onPress={onInfo}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  start: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      },
      default: { elevation: 8 },
    }),
  },
  pillShadow: {
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: '50%',
    alignSelf: 'flex-start',
  },
  pillOuter: {
    position: 'relative',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  pillShell: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderRadius: IDENTITY_PILL_CORNER_RADIUS,
    minHeight: IDENTITY_PILL_MIN_HEIGHT,
    overflow: 'hidden',
    ...Platform.select({ ios: { borderCurve: 'circular' as const }, default: {} }),
  },
  pillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    minHeight: IDENTITY_PILL_MIN_HEIGHT,
    maxWidth: '100%',
  },
  nameLeadingSpacer: {
    width: IDENTITY_NAME_LEADING_RESERVE,
    flexShrink: 0,
  },
  avatarFloating: {
    position: 'absolute',
    left: IDENTITY_AVATAR_FLOAT_LEFT,
    top: '50%',
    marginTop: -IDENTITY_AVATAR_RADIUS,
    zIndex: 2,
  },
  nameWrap: {
    flexShrink: 1,
    justifyContent: 'center',
  },
  name: {
    ...theme.typography.bodyStrong,
    color: '#FFFFFF',
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
