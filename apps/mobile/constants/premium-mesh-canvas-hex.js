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
  base: '#1E1622',
  deep: '#120D17',
  gradient: ['#2E2336', '#241A2B', '#1B1422', '#120D17'],
  calmCenter: '#FFF6F0',
  heroLift: '#FFF6F0',
  gloss: '#FFF2E8',
  glossWarm: '#FFCF6B',
};

module.exports = { PREMIUM_MESH_CANVAS_HEX };
