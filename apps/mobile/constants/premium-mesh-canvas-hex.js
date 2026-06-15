/**
 * Standalone premium-mesh canvas hex tokens (no imports).
 * Safe for Expo app.config.ts (Node require) and runtime TS imports.
 *
 * @typedef {Readonly<{
 *   base: string;
 *   deep: string;
 *   gradient: readonly [string, string, string, string];
 *   calmCenter: string;
 *   heroLift: string;
 *   gloss: string;
 *   glossWarm: string;
 * }>} PremiumMeshCanvasHex
 */

/** @type {PremiumMeshCanvasHex} */
const PREMIUM_MESH_CANVAS_HEX = {
  // Warm "lit" canvas — the mesh blends ONTO this, so it must NOT be near-black,
  // or saturated hues collapse to mud. A warm espresso base lets champagne/gold/
  // orange keep their luminance when composited.
  base: '#2A1E18',
  // Deep tone only used for the gradient floor / opaque fallback (system chrome).
  deep: '#0F0B08',
  gradient: ['#2E2119', '#231811', '#18100B', '#0F0B08'],
  calmCenter: '#FFF6F0',
  heroLift: '#FFF1E6',
  gloss: '#FFF2E8',
  glossWarm: '#FFCF6B',
};

module.exports = { PREMIUM_MESH_CANVAS_HEX };
