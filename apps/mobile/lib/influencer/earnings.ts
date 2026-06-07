import type { EarningsSummary } from '@plugoh/contracts';

import { formatPaiseAsINR } from './home-tier';

export { formatPaiseAsINR };

export type EarningsTransaction = EarningsSummary['transactions'][number];

// ─── money ──────────────────────────────────────────────────────────────────

/** Hoisted so we don't rebuild the formatter on every render (see `js-hoist-intl`). */
const paiseAmountFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' });

/** Paise → bare rupee number (no ₹ symbol) for the hero card next to the coin glyph. */
export function formatPaiseAmount(value?: number | null): string {
  const paise = value ?? 0;
  const rupees = Number.isFinite(paise) ? paise / 100 : 0;
  return paiseAmountFormatter.format(rupees);
}

export const formatDate = (iso: string): string => dateFormatter.format(new Date(iso));

export const truncate = (s: string, n: number): string => (s.length > n ? s.slice(0, n) + '…' : s);

export function statusLabel(status: string): string {
  if (status === 'completed') return 'Paid';
  if (status === 'in_escrow') return 'Secured';
  return 'Pending';
}

// ─── avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#E76A92', '#F28EAF', '#D4587F', '#D7A323', '#2FA46F', '#5C84D6'] as const;

export const TX_AVATAR_SIZE = 46;
export const TX_AVATAR_RADIUS = 14;

export function campaignAvatarColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── layout constants ──────────────────────────────────────────────────────────

export const CARD_CLUSTER_RADIUS = 36;

/** ISO/IEC 7810 ID-1 payment card width ÷ height — makes the hero read as a physical card. */
export const DEBIT_CARD_ASPECT = 85.6 / 53.98;

export const WITHDRAW_BTN_HEIGHT = 52;

/** Pill track height — keep modest so the card stays airy vs the title. */
export const CHART_TRACK_HEIGHT = 76;
export const CHART_BAR_WIDTH = 7;
export const CHART_BAR_GAP = 4;

// ─── monthly series ─────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export type MonthlySeriesPoint = {
  month: string;
  label: (typeof MONTH_LABELS)[number];
  amount: number;
};

/** Current calendar year (January → December), merged with API breakdown amounts. */
export function buildCalendarYearMonthlySeries(
  breakdown: EarningsSummary['monthly_breakdown'],
): MonthlySeriesPoint[] {
  const byMonth = new Map(breakdown.map((b) => [b.month, b.amount]));
  const year = new Date().getFullYear();

  return MONTH_LABELS.map((label, index) => {
    const key = `${year}-${String(index + 1).padStart(2, '0')}`;
    return { month: key, label, amount: byMonth.get(key) ?? 0 };
  });
}
