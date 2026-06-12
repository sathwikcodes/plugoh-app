alter table if exists public.business_profiles
  add column if not exists brand_latitude double precision,
  add column if not exists brand_longitude double precision;

alter table if exists public.campaigns
  add column if not exists place_latitude double precision,
  add column if not exists place_longitude double precision;
