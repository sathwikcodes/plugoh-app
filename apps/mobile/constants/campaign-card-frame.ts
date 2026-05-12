import { theme } from '@/constants/theme';

/** Matches `GlassPlaceholderCard` shell — one source of truth for deck + placeholder. */
export const CAMPAIGN_CARD_CORNER_RADIUS = theme.spacing.section;

export const CAMPAIGN_CARD_FRAME_BORDER = 'rgba(255,255,255,0.18)';

/**
 * Fixed frame height for the swipe card and glass placeholder (not full-bleed flex).
 * Clamped so small phones still get a usable card and tall phones do not grow unbounded.
 */
export function getCampaignCardFrameHeight(screenHeight: number): number {
  return Math.round(Math.min(Math.max(screenHeight * 0.52, 360), 520));
}
