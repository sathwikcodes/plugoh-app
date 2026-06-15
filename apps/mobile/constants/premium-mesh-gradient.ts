/**
 * Premium mesh gradient tokens.
 *
 * **Screen canvas (edit for in-app background):**
 * - `PREMIUM_BACKGROUND_MESH_COLORS` — ambient bloom hues
 * - `PREMIUM_BACKGROUND_MESH_OPACITIES` — per-vertex strength (centre lowest)
 *
 * **Earnings card only (full saturation — do not use for screen canvas):**
 * - `PREMIUM_EARNINGS_MESH_COLORS` / `PREMIUM_EARNINGS_MESH_POINTS`
 *
 * Base/deep/gradient hex: `background-palette.ts` → `PREMIUM_MESH_CANVAS_HEX`.
 */

export const PREMIUM_EARNINGS_MESH_POINTS = [
  [0.0, 0.0],
  [0.5, 0.0],
  [1.0, 0.0],
  [0.0, 0.5],
  [0.62, 0.4],
  [1.0, 0.5],
  [0.0, 1.0],
  [0.5, 1.0],
  [1.0, 1.0],
] as const;

/** Row-major 3×3 — purple top-left, gold bottom-right, orange/cream through centre. */
export const PREMIUM_EARNINGS_MESH_COLORS = [
  '#9B1FFF',
  '#E04BFF',
  '#FFD24D',
  '#B81CFF',
  '#FF8F3C',
  '#FFB300',
  '#D81FF0',
  '#FF8A00',
  '#FF7A00',
] as const;

export const PREMIUM_EARNINGS_SHELL_FALLBACK = '#E7B27A';

/**
 * Ambient full-screen mesh — same layout as the card, fully WARM (no purple).
 * Champagne-gold lead: rose accent top-left, gold leading top-right/mid-right,
 * orange grounding the bottom. Champagne centre kept lowest so the hero stays open.
 * Soft but clearly visible — harmonised with the saturated earnings card.
 */
export const PREMIUM_BACKGROUND_MESH_COLORS = [
  '#F4A6B0', // top-left — soft rose / champagne pink accent
  '#F7C58C', // top-center — peach-gold
  '#FFCF6B', // top-right — gold (lead)
  '#E89A86', // mid-left — warm coral
  '#F3C9A8', // centre — champagne (lowest opacity)
  '#FFB347', // mid-right — warm orange-gold (lead)
  '#E98A6A', // bottom-left — warm terracotta
  '#FF8A3D', // bottom-center — deep orange
  '#FF9F5A', // bottom-right — orange
] as const;

/**
 * Per-vertex strength. Blended onto the WARM lit base (`#2A1E18`), so these need
 * to be high enough that the hue reads — at low alpha a light champagne hue just
 * collapses into the base. Edges/corners carry the colour; the centre is kept
 * lowest so it stays calm and the hero metrics remain legible.
 */
export const PREMIUM_BACKGROUND_MESH_OPACITIES = [
  0.42, 0.46, 0.5, 0.34, 0.14, 0.46, 0.42, 0.46, 0.5,
] as const;

/** Accent hues at full strength — earnings card, CTAs, spectrum previews only. */
export const PREMIUM_ACCENT_MESH_COLORS = [
  '#FF6EC8',
  '#FF78D8',
  '#FFE08A',
  '#FF8AD0',
  '#FFC878',
  '#FFD966',
  '#FF5CB8',
  '#FFC85A',
  '#FFB830',
] as const;

function parseHexRgb(hex: string): readonly [number, number, number] {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized.slice(0, 6);
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ] as const;
}

function toHexByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0');
}

/** Opaque color that matches `overlay` at `alpha` composited over `base` (MeshGradientView needs opaque). */
export function blendHex(baseHex: string, overlayHex: string, alpha: number): string {
  const [br, bg, bb] = parseHexRgb(baseHex);
  const [or, og, ob] = parseHexRgb(overlayHex);
  return `#${toHexByte(br + (or - br) * alpha)}${toHexByte(bg + (og - bg) * alpha)}${toHexByte(bb + (ob - bb) * alpha)}`;
}

/** Screen mesh colors pre-blended onto the canvas base — avoids rgba wash on iOS. */
export function getPremiumBackgroundMeshGradientColors(baseHex = '#221820'): string[] {
  return PREMIUM_BACKGROUND_MESH_COLORS.map((color, index) =>
    blendHex(baseHex, color, PREMIUM_BACKGROUND_MESH_OPACITIES[index] ?? 0.06),
  );
}
