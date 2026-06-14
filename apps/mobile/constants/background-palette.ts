/**
 * Hero background palettes for the global glossy canvas.
 *
 * **Retune in-app screen background (premium-mesh):**
 * 1. Edit hex values in `premium-mesh-canvas-hex.js` → `PREMIUM_MESH_CANVAS_HEX`.
 * 2. Edit ambient mesh hues in `premium-mesh-gradient.ts` → `PREMIUM_BACKGROUND_MESH_*`.
 * 3. Do not edit `PREMIUM_EARNINGS_MESH_*` for screen canvas (earnings card only).
 *
 * **Switch entire canvas style:** change `ACTIVE_BACKGROUND_PALETTE_ID` only.
 */

import {
  PREMIUM_BACKGROUND_MESH_COLORS,
  PREMIUM_BACKGROUND_MESH_OPACITIES,
  PREMIUM_EARNINGS_MESH_COLORS,
  PREMIUM_EARNINGS_MESH_POINTS,
} from '@/constants/premium-mesh-gradient';
import { PREMIUM_MESH_CANVAS_HEX } from '@/constants/premium-mesh-canvas-hex.js';

export { PREMIUM_MESH_CANVAS_HEX };

export type BackgroundPaletteId =
  | 'premium-mesh'
  | 'aurora-pop'
  | 'sunset-fizz'
  | 'candy-cloud'
  | 'neon-calm';

export type BackgroundMesh = {
  /** Normalized 0–1 control points (same layout as earnings hero card). */
  points: readonly (readonly [number, number])[];
  colors: readonly string[];
  /** Default bloom strength when `opacities` is omitted. */
  opacity: number;
  /** Optional per-vertex multiplier (same order as `colors`). */
  opacities?: readonly number[];
  bloomSize: number;
};

export type BackgroundBloom = {
  color: string;
  opacity: number;
  size: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
};

export type BackgroundPalette = {
  id: BackgroundPaletteId;
  label: string;
  description: string;
  /** Solid fallback for system chrome, splash, and opaque layers */
  base: string;
  /** Deepest tone for gradient end / vignette */
  deep: string;
  /** Rich multi-stop hero gradient (chromatic dark, not muddy gray-black) */
  gradient: readonly [string, string, string, string];
  gradientLocations: readonly [number, number, number, number];
  gradientStart: { x: number; y: number };
  gradientEnd: { x: number; y: number };
  /** Layered ambient blooms — pink / gold / accent (violet, coral, etc.) */
  blooms: {
    pink: BackgroundBloom;
    gold: BackgroundBloom;
    accent: BackgroundBloom;
  };
  /** Optional 3×3 mesh — when set, replaces the three static blooms. */
  mesh?: BackgroundMesh;
  /** Soft radial clear zone — keeps the hero area open like Luma's airy centre. */
  calmCenter?: { color: string; opacity: number; size: number; top: number; left: number };
  /** Soft top lift — keeps hero metrics readable over the mesh. */
  heroLift?: { color: string; opacity: number; height?: number };
  /** Top gloss sheen — lifts the canvas so it feels alive, not flat */
  gloss: { color: string; opacity: number };
  /** Secondary warm highlight for a premium lacquer finish */
  glossWarm?: { color: string; opacity: number };
};

export const BACKGROUND_PALETTES: Record<BackgroundPaletteId, BackgroundPalette> = {
  'premium-mesh': {
    id: 'premium-mesh',
    label: 'Premium Mesh',
    description:
      'Breathable pink/gold ambient mesh — Luma-style restraint: colour at the edges, calm open hero centre.',
    base: PREMIUM_MESH_CANVAS_HEX.base,
    deep: PREMIUM_MESH_CANVAS_HEX.deep,
    gradient: PREMIUM_MESH_CANVAS_HEX.gradient,
    gradientLocations: [0, 0.28, 0.62, 1],
    gradientStart: { x: 0.05, y: 0 },
    gradientEnd: { x: 0.95, y: 1 },
    blooms: {
      pink: { color: PREMIUM_EARNINGS_MESH_COLORS[1], opacity: 0, size: 0 },
      gold: { color: PREMIUM_EARNINGS_MESH_COLORS[2], opacity: 0, size: 0 },
      accent: { color: PREMIUM_EARNINGS_MESH_COLORS[4], opacity: 0, size: 0 },
    },
    mesh: {
      points: PREMIUM_EARNINGS_MESH_POINTS,
      colors: PREMIUM_BACKGROUND_MESH_COLORS,
      opacity: 0.06,
      opacities: PREMIUM_BACKGROUND_MESH_OPACITIES,
      bloomSize: 440,
    },
    calmCenter: {
      color: PREMIUM_MESH_CANVAS_HEX.calmCenter,
      opacity: 0.07,
      size: 520,
      top: -80,
      left: -60,
    },
    heroLift: { color: PREMIUM_MESH_CANVAS_HEX.heroLift, opacity: 0.06, height: 0.58 },
    gloss: { color: PREMIUM_MESH_CANVAS_HEX.gloss, opacity: 0.09 },
    glossWarm: { color: PREMIUM_MESH_CANVAS_HEX.glossWarm, opacity: 0.05 },
  },
  'aurora-pop': {
    id: 'aurora-pop',
    label: 'Aurora Pop',
    description:
      'Violet dusk with coral-pink and peach-gold aurora. Energetic, playful, still easy on the eyes.',
    base: '#160A1E',
    deep: '#07030C',
    gradient: ['#3A1860', '#1E0F2E', '#160A1E', '#07030C'],
    gradientLocations: [0, 0.32, 0.68, 1],
    gradientStart: { x: 0.05, y: 0 },
    gradientEnd: { x: 0.95, y: 1 },
    blooms: {
      pink: { color: '#FF5C9A', opacity: 0.28, top: -120, left: -80, size: 420 },
      gold: { color: '#FFB07A', opacity: 0.22, top: 80, right: -100, size: 380 },
      accent: { color: '#9B5CFF', opacity: 0.2, bottom: -140, left: -60, size: 460 },
    },
    gloss: { color: '#FFD0E8', opacity: 0.07 },
  },
  'sunset-fizz': {
    id: 'sunset-fizz',
    label: 'Sunset Fizz',
    description:
      'Golden-hour warmth with rose spark. Feels optimistic — like opening the app at magic hour.',
    base: '#1A0E12',
    deep: '#0A0508',
    gradient: ['#4A2038', '#2A1420', '#1A0E12', '#0A0508'],
    gradientLocations: [0, 0.35, 0.7, 1],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 1, y: 1 },
    blooms: {
      pink: { color: '#FF6B8A', opacity: 0.26, top: -100, left: -40, size: 400 },
      gold: { color: '#FFC857', opacity: 0.24, top: 60, right: -80, size: 420 },
      accent: { color: '#FF4D6D', opacity: 0.14, bottom: -100, left: -20, size: 360 },
    },
    gloss: { color: '#FFE0A8', opacity: 0.08 },
  },
  'candy-cloud': {
    id: 'candy-cloud',
    label: 'Candy Cloud',
    description:
      'Soft bubblegum + lavender haze. Fun and cozy — social-app energy without neon harshness.',
    base: '#180818',
    deep: '#09040E',
    gradient: ['#4A1A5C', '#2A1038', '#180818', '#09040E'],
    gradientLocations: [0, 0.38, 0.72, 1],
    gradientStart: { x: 0.2, y: 0 },
    gradientEnd: { x: 0.8, y: 1 },
    blooms: {
      pink: { color: '#FF7EB6', opacity: 0.3, top: -110, left: -70, size: 440 },
      gold: { color: '#FFD4A8', opacity: 0.18, top: 140, right: -60, size: 340 },
      accent: { color: '#C77DFF', opacity: 0.22, bottom: -120, right: -40, size: 400 },
    },
    gloss: { color: '#FFB8E0', opacity: 0.065 },
  },
  'neon-calm': {
    id: 'neon-calm',
    label: 'Neon Calm',
    description:
      'Electric rose up top, soothing indigo below. High energy entry that settles as you scroll.',
    base: '#0E0A1A',
    deep: '#05030A',
    gradient: ['#281050', '#181030', '#0E0A1A', '#05030A'],
    gradientLocations: [0, 0.3, 0.65, 1],
    gradientStart: { x: 0.15, y: 0 },
    gradientEnd: { x: 0.85, y: 1 },
    blooms: {
      pink: { color: '#FF3D9A', opacity: 0.25, top: -90, left: -50, size: 380 },
      gold: { color: '#F5A962', opacity: 0.16, top: 100, right: -90, size: 360 },
      accent: { color: '#5B6CFF', opacity: 0.18, bottom: -110, left: -80, size: 420 },
    },
    gloss: { color: '#FF9AD5', opacity: 0.055 },
  },
};

/** Change this one value to swap the entire app background. */
export const ACTIVE_BACKGROUND_PALETTE_ID: BackgroundPaletteId = 'premium-mesh';

export function getActiveBackgroundPalette(): BackgroundPalette {
  return BACKGROUND_PALETTES[ACTIVE_BACKGROUND_PALETTE_ID];
}

export const BACKGROUND_PALETTE_LIST = Object.values(BACKGROUND_PALETTES);
