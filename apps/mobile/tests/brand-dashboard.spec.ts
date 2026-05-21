import type { CampaignListItem } from '@plugoh/contracts';
import { describe, expect, it } from 'vitest';
import { deriveBrandDashboard, formatBrandAmount } from '@/lib/brand/dashboard';

function campaign(input: Partial<CampaignListItem>): CampaignListItem {
  return {
    id: input.id ?? 'campaign-id',
    title: input.title ?? 'Campaign',
    status: input.status ?? 'requested',
    ...input,
  };
}

describe('brand dashboard derivation', () => {
  it('handles an empty brand workspace with a profile completion action', () => {
    const dashboard = deriveBrandDashboard(null, []);

    expect(dashboard.activeCampaigns).toEqual([]);
    expect(dashboard.totalCampaigns).toBe(0);
    expect(dashboard.totalSpend).toBe(0);
    expect(dashboard.monthlySpend).toEqual([]);
    expect(dashboard.readinessPercent).toBe(0);
    expect(dashboard.nextAction).toEqual({
      label: 'Finish brand profile',
      route: '/(app)/profile/edit',
    });
  });

  it('filters active business campaign statuses', () => {
    const dashboard = deriveBrandDashboard(
      { brand_name: 'Plugoh', brand_type: 'Marketplace', brand_summary: 'Creator deals' },
      [
        campaign({ id: 'requested', status: 'requested' }),
        campaign({ id: 'escrow', status: 'in_escrow' }),
        campaign({ id: 'done', status: 'completed' }),
        campaign({ id: 'cancelled', status: 'cancelled' }),
      ],
    );

    expect(dashboard.activeCampaigns.map((item) => item.id)).toEqual(['requested', 'escrow']);
  });

  it('aggregates spend by sorted valid campaign month only', () => {
    const dashboard = deriveBrandDashboard(
      { brand_name: 'Plugoh', brand_type: 'Marketplace', brand_summary: 'Creator deals' },
      [
        campaign({ price_offered: 2000, created_at: '2026-03-20T08:00:00Z' }),
        campaign({ price_offered: 3000, created_at: '2026-01-01T08:00:00Z' }),
        campaign({ price_offered: 500, created_at: '2026-03-02T08:00:00Z' }),
        campaign({ price_offered: 9999, created_at: 'not-a-date' }),
        campaign({ price_offered: 4000 }),
      ],
    );

    expect(dashboard.totalSpend).toBe(19499);
    expect(formatBrandAmount(dashboard.totalSpend)).toBe('₹19.5K');
    expect(dashboard.monthlySpend).toEqual([
      { month: 'Jan', amount: 3000 },
      { month: 'Mar', amount: 2500 },
    ]);
  });

  it('tracks readiness and next action across profile, Instagram, and campaigns', () => {
    const withoutInstagram = deriveBrandDashboard(
      { brand_name: 'Plugoh', brand_type: 'Marketplace', brand_summary: 'Creator deals' },
      [],
    );

    expect(withoutInstagram.readinessPercent).toBe(25);
    expect(withoutInstagram.nextAction).toEqual({
      label: 'Connect Instagram',
      route: '/(app)/profile/instagram',
    });

    const ready = deriveBrandDashboard(
      {
        brand_name: 'Plugoh',
        brand_type: 'Marketplace',
        brand_summary: 'Creator deals',
        instagram_connected: true,
      },
      Array.from({ length: 5 }, (_, index) =>
        campaign({ id: `campaign-${index}`, status: 'completed' }),
      ),
    );

    expect(ready.readinessPercent).toBe(100);
    expect(ready.readinessItems.every((item) => item.complete)).toBe(true);
    expect(ready.nextAction).toEqual({
      label: 'Discover creators',
      route: '/(app)/(brand-tabs)/discover',
    });
  });

  it('keeps one-month chart data as a single point for the UI empty-chart fallback', () => {
    const dashboard = deriveBrandDashboard(
      {
        brand_name: 'Plugoh',
        brand_type: 'Marketplace',
        brand_summary: 'Creator deals',
        instagram_connected: true,
      },
      [
        campaign({ price_offered: 1000, created_at: '2026-04-01T08:00:00Z' }),
        campaign({ price_offered: 2500, created_at: '2026-04-15T08:00:00Z' }),
      ],
    );

    expect(dashboard.monthlySpend).toEqual([{ month: 'Apr', amount: 3500 }]);
  });
});
