export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      campaigns: {
        Row: Record<string, Json | undefined>;
      };
      influencer_profiles: {
        Row: Record<string, Json | undefined>;
      };
      business_profiles: {
        Row: Record<string, Json | undefined>;
      };
      campaign_messages: {
        Row: Record<string, Json | undefined>;
      };
      deliveries: {
        Row: Record<string, Json | undefined>;
      };
      notifications: {
        Row: Record<string, Json | undefined>;
      };
      escrow_transactions: {
        Row: Record<string, Json | undefined>;
      };
      user_roles: {
        Row: Record<string, Json | undefined>;
      };
      influencer_payout_details: {
        Row: Record<string, Json | undefined>;
      };
      instagram_media: {
        Row: Record<string, Json | undefined>;
      };
    };
  };
};
