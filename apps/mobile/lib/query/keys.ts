export const queryKeys = {
  bootstrap: ["bootstrap"] as const,
  profile: ["profile"] as const,
  campaigns: ["campaigns"] as const,
  campaign: (id: string) => ["campaign", id] as const,
  inbox: ["inbox"] as const,
  messages: (id: string) => ["messages", id] as const,
  earnings: ["earnings"] as const,
  notifications: ["notifications"] as const,
  payout: ["payout"] as const,
};

export const coreInvalidationKeys = [
  queryKeys.bootstrap,
  queryKeys.profile,
  queryKeys.campaigns,
  queryKeys.inbox,
  queryKeys.notifications,
  queryKeys.earnings,
  queryKeys.payout,
] as const;
