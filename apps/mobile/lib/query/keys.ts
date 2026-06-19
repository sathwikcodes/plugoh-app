export const queryKeys = {
  bootstrap: ['bootstrap'] as const,
  profile: (role: 'business' | 'influencer') => ['profile', role] as const,
  campaigns: (role: 'business' | 'influencer', params?: Record<string, unknown>) =>
    ['campaigns', role, params ?? {}] as const,
  campaign: (role: 'business' | 'influencer', id: string) => ['campaign', role, id] as const,
  inbox: (role: 'business' | 'influencer') => ['inbox', role] as const,
  messages: (id: string) => ['messages', id] as const,
  earnings: ['earnings'] as const,
  notifications: (role: 'business' | 'influencer') => ['notifications', role] as const,
  discovery: (params?: Record<string, unknown>) => ['discovery', params ?? {}] as const,
  payout: ['payout'] as const,
  savedCards: ['saved-cards'] as const,
  businessProfile: ['business-profile'] as const,
};

export const coreInvalidationKeys = [
  queryKeys.bootstrap,
  queryKeys.profile('influencer'),
  queryKeys.profile('business'),
  queryKeys.campaigns('influencer'),
  queryKeys.campaigns('business'),
  queryKeys.inbox('influencer'),
  queryKeys.inbox('business'),
  queryKeys.notifications('influencer'),
  queryKeys.notifications('business'),
  queryKeys.earnings,
  queryKeys.payout,
  queryKeys.savedCards,
  queryKeys.discovery(),
  queryKeys.businessProfile,
] as const;
