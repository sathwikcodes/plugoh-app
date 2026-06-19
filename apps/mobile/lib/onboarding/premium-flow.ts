import {
  BUSINESS_TYPES,
  type BusinessOnboardingRequest,
  type InfluencerOnboardingRequest,
  type UserRole,
} from '@plugoh/contracts';

export type BrandCategory = (typeof BUSINESS_TYPES)[number];
export type BrandInstagramChoice = 'yes' | 'no' | null;

export type PremiumOnboardingValues = {
  full_name: string;
  phone: string;
  location: string;
  location_label: string;
  location_latitude: number | null;
  location_longitude: number | null;
  brand_name: string;
  brand_category: BrandCategory;
};

export type BrandCategoryOption = {
  label: string;
  value: BrandCategory;
};

export const BRAND_CATEGORY_OPTIONS: readonly BrandCategoryOption[] = [
  { label: 'Restaurant / Cafe', value: 'restaurant_cafe' },
  { label: 'D2C Brand', value: 'd2c_brand' },
  { label: 'Local Business', value: 'local_business' },
  { label: 'E-commerce', value: 'ecommerce' },
  { label: 'SaaS / Tech', value: 'saas_tech' },
  { label: 'Agency', value: 'agency' },
  { label: 'Personal Brand', value: 'personal_brand' },
  { label: 'Other', value: 'other' },
];

export const DEFAULT_PREMIUM_ONBOARDING_VALUES: PremiumOnboardingValues = {
  full_name: '',
  phone: '',
  location: '',
  location_label: '',
  location_latitude: null,
  location_longitude: null,
  brand_name: '',
  brand_category: 'restaurant_cafe',
};

export function trimOnboardingValues(values: PremiumOnboardingValues): PremiumOnboardingValues {
  return {
    ...values,
    full_name: values.full_name.trim(),
    phone: values.phone.trim(),
    location: values.location_label.trim() || values.location.trim(),
    location_label: values.location_label.trim() || values.location.trim(),
    brand_name: values.brand_name.trim(),
  };
}

export function hasSelectedLocationCoordinates(values: PremiumOnboardingValues) {
  return (
    typeof values.location_latitude === 'number' &&
    Number.isFinite(values.location_latitude) &&
    typeof values.location_longitude === 'number' &&
    Number.isFinite(values.location_longitude)
  );
}

export function hasCommonProfile(values: PremiumOnboardingValues) {
  const trimmed = trimOnboardingValues(values);
  return Boolean(trimmed.full_name && trimmed.phone.length >= 5 && trimmed.location);
}

export function hasBrandDetails(values: PremiumOnboardingValues) {
  const trimmed = trimOnboardingValues(values);
  return Boolean(trimmed.brand_name && BUSINESS_TYPES.includes(trimmed.brand_category));
}

export function buildInfluencerOnboardingPayload(
  values: PremiumOnboardingValues,
): InfluencerOnboardingRequest {
  const trimmed = trimOnboardingValues(values);
  return {
    full_name: trimmed.full_name,
    phone: trimmed.phone,
    location: trimmed.location,
  };
}

export function buildBusinessOnboardingPayload(
  values: PremiumOnboardingValues,
): BusinessOnboardingRequest {
  const trimmed = trimOnboardingValues(values);
  const payload: BusinessOnboardingRequest = {
    full_name: trimmed.full_name,
    phone: trimmed.phone,
    location: trimmed.location,
    brand_name: trimmed.brand_name,
    brand_category: trimmed.brand_category,
    brand_location: trimmed.location,
  };
  if (hasSelectedLocationCoordinates(values)) {
    payload.brand_latitude = values.location_latitude ?? undefined;
    payload.brand_longitude = values.location_longitude ?? undefined;
  }
  return payload;
}

export function needsRoleBeforeInstagram() {
  return true;
}

export function isPrimaryActionEnabled({
  role,
  values,
  brandInstagramChoice,
  needsCommonProfile,
  needsBrandDetails,
}: {
  role: UserRole;
  values: PremiumOnboardingValues;
  brandInstagramChoice: BrandInstagramChoice;
  needsCommonProfile: boolean;
  needsBrandDetails: boolean;
}) {
  if (needsCommonProfile && !hasCommonProfile(values)) return false;
  if (role === 'business' && needsCommonProfile && !hasSelectedLocationCoordinates(values)) {
    return false;
  }
  if (role === 'influencer') return true;
  if (needsBrandDetails) return hasBrandDetails(values);
  return brandInstagramChoice !== null;
}

export function primaryActionLabel({
  role,
  brandInstagramChoice,
  needsBrandDetails,
  loading,
}: {
  role: UserRole;
  brandInstagramChoice: BrandInstagramChoice;
  needsBrandDetails: boolean;
  loading: boolean;
}) {
  if (loading) return role === 'business' && needsBrandDetails ? 'Saving...' : 'Connecting...';
  if (role === 'influencer') return 'Connect Instagram';
  if (needsBrandDetails || brandInstagramChoice === 'no') return 'Complete setup';
  return 'Connect Instagram';
}
