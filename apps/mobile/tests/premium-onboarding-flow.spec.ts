import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREMIUM_ONBOARDING_VALUES,
  buildBusinessOnboardingPayload,
  buildInfluencerOnboardingPayload,
  isPrimaryActionEnabled,
  needsRoleBeforeInstagram,
  primaryActionLabel,
  type PremiumOnboardingValues,
} from '@/lib/onboarding/premium-flow';

const completeValues: PremiumOnboardingValues = {
  ...DEFAULT_PREMIUM_ONBOARDING_VALUES,
  full_name: '  Sana Verma  ',
  phone: '  98765 43210  ',
  location: '  Hyderabad  ',
  location_label: '  Jubilee Hills, Hyderabad  ',
  location_latitude: 17.4319,
  location_longitude: 78.4071,
  brand_name: '  Plugoh Cafe  ',
  brand_category: 'restaurant_cafe',
};

describe('premium onboarding flow helpers', () => {
  it('builds brand manual onboarding payload with brand_category', () => {
    expect(buildBusinessOnboardingPayload(completeValues)).toEqual({
      full_name: 'Sana Verma',
      phone: '98765 43210',
      location: 'Jubilee Hills, Hyderabad',
      brand_name: 'Plugoh Cafe',
      brand_category: 'restaurant_cafe',
      brand_location: 'Jubilee Hills, Hyderabad',
      brand_latitude: 17.4319,
      brand_longitude: 78.4071,
    });
  });

  it('builds influencer onboarding payload before Instagram connect', () => {
    expect(buildInfluencerOnboardingPayload(completeValues)).toEqual({
      full_name: 'Sana Verma',
      phone: '98765 43210',
      location: 'Jubilee Hills, Hyderabad',
    });
  });

  it('keeps influencer payload text-only even when map coordinates are selected', () => {
    expect(buildInfluencerOnboardingPayload(completeValues)).not.toHaveProperty('brand_latitude');
    expect(buildInfluencerOnboardingPayload(completeValues)).not.toHaveProperty('brand_longitude');
  });

  it('requires a saved role before Instagram OAuth for both roles', () => {
    expect(needsRoleBeforeInstagram()).toBe(true);
  });

  it('enables Brand Yes only after common profile and the Instagram choice are present', () => {
    expect(
      isPrimaryActionEnabled({
        role: 'business',
        values: { ...completeValues, full_name: '' },
        brandInstagramChoice: 'yes',
        needsCommonProfile: true,
        needsBrandDetails: false,
      }),
    ).toBe(false);

    expect(
      isPrimaryActionEnabled({
        role: 'business',
        values: completeValues,
        brandInstagramChoice: null,
        needsCommonProfile: true,
        needsBrandDetails: false,
      }),
    ).toBe(false);

    expect(
      isPrimaryActionEnabled({
        role: 'business',
        values: { ...completeValues, location_latitude: null },
        brandInstagramChoice: 'yes',
        needsCommonProfile: true,
        needsBrandDetails: false,
      }),
    ).toBe(false);

    expect(
      isPrimaryActionEnabled({
        role: 'business',
        values: completeValues,
        brandInstagramChoice: 'yes',
        needsCommonProfile: true,
        needsBrandDetails: false,
      }),
    ).toBe(true);
  });

  it('enables Brand No only when manual brand details are complete', () => {
    expect(
      isPrimaryActionEnabled({
        role: 'business',
        values: { ...completeValues, brand_name: '' },
        brandInstagramChoice: 'no',
        needsCommonProfile: true,
        needsBrandDetails: true,
      }),
    ).toBe(false);

    expect(
      isPrimaryActionEnabled({
        role: 'business',
        values: completeValues,
        brandInstagramChoice: 'no',
        needsCommonProfile: true,
        needsBrandDetails: true,
      }),
    ).toBe(true);

    expect(
      primaryActionLabel({
        role: 'business',
        brandInstagramChoice: 'no',
        needsBrandDetails: true,
        loading: false,
      }),
    ).toBe('Complete setup');
  });

  it('enables influencer Instagram only after common profile is complete', () => {
    expect(
      isPrimaryActionEnabled({
        role: 'influencer',
        values: { ...completeValues, phone: '1234' },
        brandInstagramChoice: null,
        needsCommonProfile: true,
        needsBrandDetails: false,
      }),
    ).toBe(false);

    expect(
      isPrimaryActionEnabled({
        role: 'influencer',
        values: completeValues,
        brandInstagramChoice: null,
        needsCommonProfile: true,
        needsBrandDetails: false,
      }),
    ).toBe(true);
  });
});
