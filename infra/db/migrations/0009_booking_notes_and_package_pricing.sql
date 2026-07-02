-- Booking "additional notes" field and per-package (story/post/reel) pricing.

alter table if exists public.campaigns
  add column if not exists notes text;

alter table if exists public.influencer_profiles
  add column if not exists price_per_post_paise integer,
  add column if not exists price_per_story_paise integer;
