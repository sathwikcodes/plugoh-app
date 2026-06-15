import { AppBackground } from '@/components/ui/app-background';
import { APP_HEADER_HEIGHT, AppHeader, getAppHeaderTopPadding } from '@/components/ui/app-header';
import { TabScreenCanvas, useTabScreenCanvas } from '@/components/ui/tab-screen-canvas';
import { theme } from '@/constants/theme';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ComponentProps, ReactNode } from 'react';
import { createContext, useContext } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

// ─── constants ────────────────────────────────────────────────────────────────

/**
 * Pixels of scroll travel before the background mask fully dissolves and the
 * glass becomes apparent.  Keep short so the transition feels instant.
 */
export const STICKY_HOME_HEADER_BLUR_DISTANCE = 44;

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Opaque-header zone: safe-area + header-row only. */
export function getStickyHomeHeaderOverlayHeight(insetTop: number) {
  return getAppHeaderTopPadding(insetTop) + APP_HEADER_HEIGHT;
}

/** Top padding so the first content row starts just below the header. */
export function getStickyHomeHeaderContentPadding(insetTop: number) {
  return getStickyHomeHeaderOverlayHeight(insetTop) + theme.spacing.sm;
}

// ─── context ──────────────────────────────────────────────────────────────────

const HomeHeaderScrollYContext = createContext<SharedValue<number> | null>(null);

function useHomeHeaderScrollY() {
  const v = useContext(HomeHeaderScrollYContext);
  if (!v) throw new Error('StickyHomeHeaderBar must render inside HomeScreenWithStickyHeader.');
  return v;
}

// ─── StickyHomeHeaderBar ──────────────────────────────────────────────────────

type StickyHomeHeaderBarProps = {
  insetTop: number;
  children: ReactNode;
  showBackground?: boolean;
};

/**
 * Pinned glass header bar — invisible at rest, blur reveals on scroll.
 *
 * How it works:
 *  1. On iOS 26+, GlassView provides native liquid-glass — the OS compositor
 *     blurs whatever scrolls behind the header.  On older iOS, a rich dark
 *     semi-transparent surface stands in.  This layer is ALWAYS mounted: a
 *     UIVisualEffectView / GlassView stops compositing when an ancestor's
 *     opacity hits 0, so we never animate the glass itself.
 *  2. A "rest cover" sits on top of the glass — a pixel-aligned copy of the
 *     screen's `AppBackground` gradient.  It is rendered full-window-tall and
 *     anchored at top:0 (clipped to the header), so it lines up exactly with
 *     the real gradient behind the header.  At rest it is fully opaque, so the
 *     header looks identical to the background (no panel, no dark band).
 *  3. As content scrolls under the header, the rest cover fades to transparent,
 *     uncovering the always-on glass — so the blur appears only on scroll.
 *  4. The header lives in an absolute overlay above the ScrollView so GlassView
 *     can sample the live scroll surface through the iOS window compositor.
 */
export function StickyHomeHeaderBar({
  insetTop,
  children,
  showBackground = true,
}: StickyHomeHeaderBarProps) {
  const scrollY = useHomeHeaderScrollY();
  const { height: windowHeight } = useWindowDimensions();
  const headerZoneHeight = getStickyHomeHeaderOverlayHeight(insetTop);

  // Rest cover (the gradient copy) is opaque at rest → transparent on scroll.
  // We fade the gradient copy, never the glass, to preserve native compositing.
  const restCoverStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, STICKY_HOME_HEADER_BLUR_DISTANCE],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View style={[styles.bar, { height: headerZoneHeight }]} pointerEvents="box-none">
      {/* ── glass layer: liquid glass on iOS 26+, rich dark surface on older iOS ── */}
      {showBackground ? (
        isLiquidGlassAvailable() ? (
          <GlassView
            glassEffectStyle="regular"
            colorScheme="dark"
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fallbackSurface]} />
        )
      ) : null}

      {/* ── rest cover — exact gradient copy, opaque at rest, fades on scroll ──
           Full-window-tall AppBackground anchored at top:0 and clipped to the
           header, so it matches the real background pixel-for-pixel. ── */}
      {showBackground ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.restCover, restCoverStyle]}
        >
          <AppBackground
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: undefined,
              height: windowHeight,
            }}
          />
        </Animated.View>
      ) : null}

      {/* ── header content ── */}
      <View
        style={[
          styles.barContent,
          { paddingTop: getAppHeaderTopPadding(insetTop), height: headerZoneHeight },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

// ─── StickyHomeHeader ─────────────────────────────────────────────────────────

type StickyHomeHeaderProps = {
  insetTop: number;
  showBackground?: boolean;
} & Pick<
  ComponentProps<typeof AppHeader>,
  'title' | 'showLogoTitle' | 'logoAccessibilityLabel' | 'profile'
>;

export function StickyHomeHeader({
  insetTop,
  title,
  showLogoTitle,
  logoAccessibilityLabel,
  profile,
  showBackground,
}: StickyHomeHeaderProps) {
  return (
    <StickyHomeHeaderBar insetTop={insetTop} showBackground={showBackground}>
      <AppHeader
        title={title}
        showLogoTitle={showLogoTitle}
        logoAccessibilityLabel={logoAccessibilityLabel}
        profile={profile}
      />
    </StickyHomeHeaderBar>
  );
}

// ─── HomeScreenWithStickyHeader ───────────────────────────────────────────────

type HomeScreenWithStickyHeaderProps = Omit<ScrollViewProps, 'children'> & {
  insetTop: number;
  header: ReactNode;
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * Home-screen shell: scrollable body + absolute pinned frosted header overlay.
 *
 * The header lives in a separate View layer above the ScrollView so
 * BlurView / GlassView can sample the live scroll surface through the iOS
 * window compositor.  The header is NOT embedded via stickyHeaderIndices
 * because UIVisualEffectView cannot sample content inside the same ScrollView.
 */
export function HomeScreenWithStickyHeader({
  insetTop,
  header,
  children,
  contentContainerStyle,
  style,
  ...scrollProps
}: HomeScreenWithStickyHeaderProps) {
  const tabCanvas = useTabScreenCanvas();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const scrollView = (
    <Animated.ScrollView
      {...scrollProps}
      style={[styles.screen, style]}
      contentContainerStyle={[
        styles.screenContent,
        { paddingTop: getStickyHomeHeaderContentPadding(insetTop) },
        contentContainerStyle,
      ]}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </Animated.ScrollView>
  );

  return (
    <HomeHeaderScrollYContext.Provider value={scrollY}>
      <View style={styles.root}>
        {tabCanvas ? <TabScreenCanvas>{scrollView}</TabScreenCanvas> : scrollView}
        {/* Absolute overlay — sits above the scroll surface for correct blur sampling */}
        <View
          style={[styles.headerLayer, { height: getStickyHomeHeaderOverlayHeight(insetTop) }]}
          pointerEvents="box-none"
        >
          {header}
        </View>
      </View>
    </HomeHeaderScrollYContext.Provider>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: theme.colors.backgroundClear,
  },
  screenContent: {
    padding: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  headerLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  bar: {
    flex: 1,
    // NO overflow:hidden — would clip GlassView and create a hard edge.
    // The full-height gradient handles the soft bottom transition instead.
  },
  /** Dark translucent surface for devices without liquid glass (pre-iOS 26). */
  fallbackSurface: {
    backgroundColor: 'rgba(10, 6, 18, 0.85)',
  },
  /** Clips the full-window gradient copy down to the header bounds. */
  restCover: {
    overflow: 'hidden',
  },
  barContent: {
    paddingHorizontal: theme.spacing.xxl,
    justifyContent: 'flex-end',
  },
});
