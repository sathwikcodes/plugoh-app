import {
  PREMIUM_GLASS_BASE_STOPS,
  PREMIUM_GLASS_BLOBS,
  PREMIUM_GLASS_LINEAR_OVERLAYS,
  PREMIUM_GLASS_OVERLAY_RADIALS,
  type GlassRadial,
} from '@/constants/premium-glass-radials';
import { memo, useId, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

/**
 * Full-screen warm-glass background — a true radial-gradient port of the approved
 * HTML preview. Uses `react-native-svg` (always paints, any iOS version) instead of
 * `expo-mesh-gradient`'s `MeshGradientView` (iOS 18+ only, linear interpolation).
 *
 * The Svg uses a `0..100` viewBox with `preserveAspectRatio="none"`, so every blob's
 * cx/cy/rx/ry is a percentage of the screen — a 1:1 match for the CSS `radial-gradient`
 * geometry in `design-preview/warm-glass-background.html`.
 */
function RadialDef({ radial, id }: { radial: GlassRadial; id: string }) {
  return (
    <RadialGradient
      id={id}
      cx={radial.cx}
      cy={radial.cy}
      rx={radial.rx}
      ry={radial.ry}
      gradientUnits="userSpaceOnUse"
    >
      <Stop offset="0" stopColor={radial.color} stopOpacity={radial.alpha} />
      <Stop offset={radial.falloff} stopColor={radial.color} stopOpacity={0} />
    </RadialGradient>
  );
}

export const PremiumGlassCanvas = memo(function PremiumGlassCanvas() {
  // Explicit pixel dimensions (not "100%"): inside a nested absoluteFill / zIndex
  // layer the percentage parent size can resolve to 0 and the SVG paints nothing.
  // Window dimensions always fill the screen; the 0..100 viewBox scales to fit.
  const { width, height } = useWindowDimensions();

  // react-native-svg registers gradient ids globally. Multiple PremiumGlassCanvas
  // instances mount at once (root canvas + per-tab canvas), so identical ids collide
  // and the visible canvas fails to resolve its `url(#...)` fills — painting only the
  // flat base gradient. Scope every id to this instance to keep them unique.
  const rawId = useId();
  const gid = useMemo(() => {
    const prefix = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
    return (id: string) => `${prefix}-${id}`;
  }, [rawId]);

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width={width}
      height={height}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      pointerEvents="none"
    >
      <Defs>
        <SvgLinearGradient id={gid('glass-base')} x1="0" y1="0" x2="0" y2="1">
          {PREMIUM_GLASS_BASE_STOPS.map((stop) => (
            <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={1} />
          ))}
        </SvgLinearGradient>

        {PREMIUM_GLASS_BLOBS.map((blob) => (
          <RadialDef key={blob.id} radial={blob} id={gid(blob.id)} />
        ))}
        {PREMIUM_GLASS_OVERLAY_RADIALS.map((radial) => (
          <RadialDef key={radial.id} radial={radial} id={gid(radial.id)} />
        ))}

        {PREMIUM_GLASS_LINEAR_OVERLAYS.map((overlay) => (
          <SvgLinearGradient key={overlay.id} id={gid(overlay.id)} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={overlay.color} stopOpacity={overlay.alpha} />
            <Stop offset={overlay.fade} stopColor={overlay.color} stopOpacity={0} />
          </SvgLinearGradient>
        ))}
      </Defs>

      {/* Painted back-to-front, mirroring the preview's stacking order. */}
      <Rect x="0" y="0" width="100" height="100" fill={`url(#${gid('glass-base')})`} />
      {PREMIUM_GLASS_BLOBS.map((blob) => (
        <Rect key={blob.id} x="0" y="0" width="100" height="100" fill={`url(#${gid(blob.id)})`} />
      ))}
      <Rect x="0" y="0" width="100" height="100" fill={`url(#${gid('hero-lift')})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#${gid('calm')})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#${gid('specular')})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#${gid('warm-bottom')})`} />
      <Rect x="0" y="0" width="100" height="100" fill={`url(#${gid('top-gloss')})`} />
    </Svg>
  );
});
