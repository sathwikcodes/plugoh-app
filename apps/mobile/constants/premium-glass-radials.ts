/**
 * Premium warm-glass background spec — a 1:1 port of the approved HTML preview
 * (`design-preview/warm-glass-background.html`, the champagne-gold `.v-gold` variant).
 *
 * Rendered by `PremiumGlassCanvas` with `react-native-svg`. Coordinates are in a
 * `0..100` user space (the Svg uses `viewBox="0 0 100 100"` +
 * `preserveAspectRatio="none"`), so cx/cy/rx/ry are percentages — exactly like the
 * CSS `radial-gradient(rx% ry% at cx% cy%, …)` syntax in the preview.
 *
 * Tuning: blob `alpha` = intensity; blob `color` = hue balance. The centre is kept
 * clear (calm overlay + low blob coverage) so hero metrics stay legible.
 */

/** Vertical base gradient (darkest at the bottom). */
export const PREMIUM_GLASS_BASE_STOPS = [
  { offset: 0, color: '#241813' },
  { offset: 0.28, color: '#1C130E' },
  { offset: 0.62, color: '#150E0A' },
  { offset: 1, color: '#0F0B08' },
] as const;

export type GlassRadial = {
  id: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  /** Peak opacity at the centre (offset 0). */
  alpha: number;
  /** Offset (0..1) at which the colour has faded to fully transparent. */
  falloff: number;
};

/** Warm colour blobs — champagne pink / gold / orange scattered like glossy glass. */
export const PREMIUM_GLASS_BLOBS: readonly GlassRadial[] = [
  { id: 'rose-tl', cx: 12, cy: 0, rx: 120, ry: 90, color: '#F4A6B0', alpha: 0.34, falloff: 0.55 },
  { id: 'gold-tr', cx: 88, cy: 4, rx: 110, ry: 80, color: '#FFCF6B', alpha: 0.4, falloff: 0.55 },
  { id: 'orange-r', cx: 95, cy: 52, rx: 120, ry: 90, color: '#FFB347', alpha: 0.4, falloff: 0.55 },
  { id: 'coral-l', cx: 6, cy: 60, rx: 120, ry: 95, color: '#E89A86', alpha: 0.3, falloff: 0.55 },
  {
    id: 'orange-b',
    cx: 50,
    cy: 104,
    rx: 130,
    ry: 100,
    color: '#FF8A3D',
    alpha: 0.42,
    falloff: 0.58,
  },
  {
    id: 'orange-br',
    cx: 92,
    cy: 100,
    rx: 140,
    ry: 110,
    color: '#FF9F5A',
    alpha: 0.4,
    falloff: 0.55,
  },
] as const;

/** Radial glass overlays — specular catch-light, calm centre, warm bottom gloss. */
export const PREMIUM_GLASS_OVERLAY_RADIALS: readonly GlassRadial[] = [
  { id: 'specular', cx: 22, cy: 6, rx: 80, ry: 50, color: '#FFF6F0', alpha: 0.16, falloff: 0.6 },
  { id: 'calm', cx: 42, cy: 30, rx: 60, ry: 42, color: '#FFF6F0', alpha: 0.09, falloff: 0.7 },
  {
    id: 'warm-bottom',
    cx: 50,
    cy: 100,
    rx: 120,
    ry: 50,
    color: '#FFCF6B',
    alpha: 0.08,
    falloff: 0.6,
  },
] as const;

export type GlassLinearOverlay = {
  id: string;
  color: string;
  alpha: number;
  /** Offset (0..1) at which the sheen has faded to fully transparent. */
  fade: number;
};

/** Vertical linear sheens — top gloss + hero lift (both fade downward to transparent). */
export const PREMIUM_GLASS_LINEAR_OVERLAYS: readonly GlassLinearOverlay[] = [
  { id: 'hero-lift', color: '#FFF1E6', alpha: 0.07, fade: 0.58 },
  { id: 'top-gloss', color: '#FFF2E8', alpha: 0.1, fade: 0.48 },
] as const;
