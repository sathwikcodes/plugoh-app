-- =============================================================================
-- Plugoh: seed one influencer-visible campaign with real map coordinates
-- =============================================================================
-- Use this after running infra/db/migrations/0006_location_coordinates.sql.
--
-- 1. Replace v_influencer_user_id with the auth.users.id for the influencer
--    account you are using in the app.
-- 2. Optionally replace v_business_user_id with an existing business auth user.
--    If left null, the script picks an existing business profile, or another
--    auth user if available.
-- 3. Run the whole script in the Supabase SQL Editor as postgres/service role.
-- 4. Re-open/refetch the app. The influencer Campaign detail Location section
--    should render the native map immediately because coordinates are seeded.
--
-- Safe to re-run: it deletes the previous "Seed: Map Preview Campaign" rows
-- for this influencer/business pair before inserting a fresh campaign.
-- =============================================================================

do $$
declare
  -- >>> PASTE YOUR INFLUENCER AUTH USER UUID HERE <<<
  v_influencer_user_id uuid := '00000000-0000-4000-8000-000000000000';

  -- Optional. Leave null to auto-pick/create around an existing business user.
  v_business_user_id uuid := null;

  v_influencer_profile_id uuid;
  v_campaign_id uuid := gen_random_uuid();
  v_campaign_title text := 'Seed: Map Preview Campaign';
  v_brand_name text := 'Plugoh Map Cafe';
  v_place_name text := 'Third Wave Coffee, Jubilee Hills, Hyderabad';
  v_place_latitude double precision := 17.4319;
  v_place_longitude double precision := 78.4071;
  v_due_date date := current_date + 7;
  v_price_paise integer := 2200000;
  v_platform_fee_paise integer := 264000;
  v_now timestamptz := now();
begin
  if v_influencer_user_id = '00000000-0000-4000-8000-000000000000'::uuid then
    raise exception 'Replace v_influencer_user_id with your influencer auth.users.id first.';
  end if;

  alter table if exists public.business_profiles
    add column if not exists brand_latitude double precision,
    add column if not exists brand_longitude double precision;

  alter table if exists public.campaigns
    add column if not exists place_latitude double precision,
    add column if not exists place_longitude double precision;

  if not exists (select 1 from auth.users where id = v_influencer_user_id) then
    raise exception 'Influencer user % not found in auth.users', v_influencer_user_id;
  end if;

  if v_business_user_id is null then
    select user_id
    into v_business_user_id
    from public.business_profiles
    where user_id <> v_influencer_user_id
    order by updated_at desc nulls last
    limit 1;
  end if;

  if v_business_user_id is null then
    select id
    into v_business_user_id
    from auth.users
    where id <> v_influencer_user_id
    order by created_at desc nulls last
    limit 1;
  end if;

  if v_business_user_id is null then
    raise exception 'No business user found. Create/sign up one business account first, or set v_business_user_id.';
  end if;

  insert into public.profiles (id, email, full_name, phone, location, avatar_url)
  select
    v_influencer_user_id,
    coalesce(u.email, 'creator-map-seed@plugoh.dev'),
    coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), 'Map Preview Creator'),
    '+919999999001',
    'Hyderabad',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop'
  from auth.users u
  where u.id = v_influencer_user_id
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    phone = coalesce(public.profiles.phone, excluded.phone),
    location = coalesce(public.profiles.location, excluded.location),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  insert into public.profiles (id, email, full_name, phone, location, avatar_url)
  select
    v_business_user_id,
    coalesce(u.email, 'brand-map-seed@plugoh.dev'),
    coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), 'Map Preview Brand Owner'),
    '+919999999002',
    'Jubilee Hills, Hyderabad',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=400&fit=crop'
  from auth.users u
  where u.id = v_business_user_id
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    phone = coalesce(public.profiles.phone, excluded.phone),
    location = coalesce(public.profiles.location, excluded.location),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  delete from public.user_roles where user_id in (v_influencer_user_id, v_business_user_id);
  insert into public.user_roles (user_id, role)
  values
    (v_influencer_user_id, 'influencer'),
    (v_business_user_id, 'business');

  insert into public.influencer_profiles (
    user_id,
    display_name,
    city,
    category,
    bio,
    follower_count,
    avg_likes_per_reel,
    price_per_reel_paise,
    is_active,
    profile_photo_url,
    updated_at
  )
  values (
    v_influencer_user_id,
    'Map Preview Creator',
    'Hyderabad',
    'food',
    'Food and lifestyle creator available for cafe visits, reels, and launch moments.',
    28000,
    860,
    v_price_paise,
    true,
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
    v_now
  )
  on conflict (user_id) do update set
    display_name = coalesce(public.influencer_profiles.display_name, excluded.display_name),
    city = coalesce(public.influencer_profiles.city, excluded.city),
    category = coalesce(public.influencer_profiles.category, excluded.category),
    bio = coalesce(public.influencer_profiles.bio, excluded.bio),
    follower_count = coalesce(public.influencer_profiles.follower_count, excluded.follower_count),
    avg_likes_per_reel = coalesce(public.influencer_profiles.avg_likes_per_reel, excluded.avg_likes_per_reel),
    price_per_reel_paise = coalesce(public.influencer_profiles.price_per_reel_paise, excluded.price_per_reel_paise),
    is_active = true,
    profile_photo_url = coalesce(public.influencer_profiles.profile_photo_url, excluded.profile_photo_url),
    updated_at = excluded.updated_at
  returning id into v_influencer_profile_id;

  insert into public.business_profiles (
    user_id,
    brand_name,
    brand_category,
    brand_location,
    brand_latitude,
    brand_longitude,
    brand_summary,
    tagline,
    instagram_username,
    instagram_profile_picture_url,
    instagram_followers_count,
    instagram_connected_at,
    updated_at
  )
  values (
    v_business_user_id,
    v_brand_name,
    'restaurant_cafe',
    v_place_name,
    v_place_latitude,
    v_place_longitude,
    'A seeded cafe brand for validating campaign detail maps, location cards, and influencer booking UI.',
    'Seeded map-ready campaign.',
    'plugoh_map_cafe',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop',
    18420,
    v_now - interval '9 days',
    v_now
  )
  on conflict (user_id) do update set
    brand_name = excluded.brand_name,
    brand_category = coalesce(public.business_profiles.brand_category, excluded.brand_category),
    brand_location = excluded.brand_location,
    brand_latitude = excluded.brand_latitude,
    brand_longitude = excluded.brand_longitude,
    brand_summary = coalesce(public.business_profiles.brand_summary, excluded.brand_summary),
    tagline = coalesce(public.business_profiles.tagline, excluded.tagline),
    instagram_username = coalesce(public.business_profiles.instagram_username, excluded.instagram_username),
    instagram_profile_picture_url = coalesce(public.business_profiles.instagram_profile_picture_url, excluded.instagram_profile_picture_url),
    instagram_followers_count = coalesce(public.business_profiles.instagram_followers_count, excluded.instagram_followers_count),
    instagram_connected_at = coalesce(public.business_profiles.instagram_connected_at, excluded.instagram_connected_at),
    updated_at = excluded.updated_at;

  delete from public.campaign_files
  where campaign_id in (
    select id from public.campaigns
    where influencer_id = v_influencer_user_id
      and business_id = v_business_user_id
      and title = v_campaign_title
  );

  delete from public.campaign_message_reads
  where message_id in (
    select m.id
    from public.campaign_messages m
    join public.campaigns c on c.id = m.campaign_id
    where c.influencer_id = v_influencer_user_id
      and c.business_id = v_business_user_id
      and c.title = v_campaign_title
  );

  delete from public.campaign_messages
  where campaign_id in (
    select id from public.campaigns
    where influencer_id = v_influencer_user_id
      and business_id = v_business_user_id
      and title = v_campaign_title
  );

  delete from public.deliveries
  where campaign_id in (
    select id from public.campaigns
    where influencer_id = v_influencer_user_id
      and business_id = v_business_user_id
      and title = v_campaign_title
  );

  delete from public.escrow_ledger_entries
  where payment_order_id in (
    select po.id
    from public.payment_orders po
    join public.campaigns c on c.id = po.campaign_id
    where c.influencer_id = v_influencer_user_id
      and c.business_id = v_business_user_id
      and c.title = v_campaign_title
  )
  or campaign_id in (
    select id from public.campaigns
    where influencer_id = v_influencer_user_id
      and business_id = v_business_user_id
      and title = v_campaign_title
  );

  delete from public.payment_orders
  where campaign_id in (
    select id from public.campaigns
    where influencer_id = v_influencer_user_id
      and business_id = v_business_user_id
      and title = v_campaign_title
  );

  delete from public.campaigns
  where influencer_id = v_influencer_user_id
    and business_id = v_business_user_id
    and title = v_campaign_title;

  insert into public.campaigns (
    id,
    business_id,
    influencer_id,
    influencer_profile_id,
    title,
    ai_title,
    brief,
    package_type,
    objective,
    timing_mode,
    due_date,
    place_name,
    place_latitude,
    place_longitude,
    price_offered_paise,
    platform_fee_paise,
    business_contact_email,
    business_contact_phone,
    status,
    pre_authorized_at,
    accepted_at,
    payment_captured_at,
    expires_at,
    created_at,
    updated_at
  )
  values (
    v_campaign_id,
    v_business_user_id,
    v_influencer_user_id,
    v_influencer_profile_id,
    v_campaign_title,
    'Cafe Visit Reel',
    format(
      E'Objective: visit_place\nPackage: instagram_reel\nDue date: %s\nPlace: %s\nCreate a warm cafe visit reel showing the ambience, hero drink, and one creator-led recommendation.',
      v_due_date,
      v_place_name
    ),
    'instagram_reel',
    'visit_place',
    'choose_date',
    v_due_date,
    v_place_name,
    v_place_latitude,
    v_place_longitude,
    v_price_paise,
    v_platform_fee_paise,
    'brand-map-seed@plugoh.dev',
    '+919999999002',
    'in_escrow',
    v_now - interval '2 days',
    v_now - interval '1 day',
    v_now - interval '23 hours',
    v_now + interval '14 days',
    v_now - interval '2 days',
    v_now
  );

  insert into public.payment_orders (
    campaign_id,
    provider,
    provider_order_id,
    provider_payment_id,
    payment_method,
    status,
    amount_paise,
    currency,
    authorized_at,
    captured_at,
    metadata,
    created_at,
    updated_at
  )
  values (
    v_campaign_id,
    'razorpay',
    'order_seed_map_preview',
    'pay_seed_map_preview',
    'card',
    'captured',
    v_price_paise + v_platform_fee_paise,
    'INR',
    v_now - interval '2 days',
    v_now - interval '23 hours',
    jsonb_build_object('seed', true),
    v_now - interval '2 days',
    v_now
  );

  insert into public.campaign_messages (campaign_id, sender_id, message_type, content, metadata, created_at)
  values (
    v_campaign_id,
    v_business_user_id,
    'booking_card',
    'Cafe visit reel booking with a seeded map-ready location.',
    jsonb_build_object('campaignId', v_campaign_id, 'seed', true),
    v_now - interval '2 days'
  );

  raise notice 'Seeded map campaign %. influencer_user=% business_user=% coords=(%, %)',
    v_campaign_id, v_influencer_user_id, v_business_user_id, v_place_latitude, v_place_longitude;
end $$;

-- Quick verification:
-- select
--   c.id,
--   c.title,
--   c.status,
--   c.place_name,
--   c.place_latitude,
--   c.place_longitude,
--   bp.brand_name,
--   bp.brand_latitude,
--   bp.brand_longitude
-- from public.campaigns c
-- join public.business_profiles bp on bp.user_id = c.business_id
-- where c.title = 'Seed: Map Preview Campaign'
-- order by c.created_at desc
-- limit 5;
