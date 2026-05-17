-- =============================================================================
-- Plugoh: seed a full business profile + demo campaigns for one auth user
-- =============================================================================
-- 1. Replace the UUID below with your auth.users.id
-- 2. Run the whole script in Supabase SQL Editor (as postgres / service role)
-- 3. Safe to re-run: deletes prior campaigns titled "Seed:%" for this user first
-- 4. Sign out and sign back in on the mobile app so bootstrap picks up role = business
--
-- Requires at least one row in influencer_profiles with is_active = true.
-- =============================================================================

DO $$
DECLARE
  -- >>> PASTE YOUR USER UUID HERE <<<
  v_user_id uuid := '00000000-0000-4000-8000-000000000000';

  v_auth record;
  v_profile record;
  v_influencer_a record;
  v_influencer_b record;
  v_brand_name text;
  v_contact_email text;
  v_contact_phone text := '+919876543210';
  v_base timestamptz := now() - interval '7 days';
  v_campaign_id uuid;
  v_status text;
  v_price numeric;
  v_fee numeric;
  v_total numeric;
  v_inf_profile_id uuid;
  v_inf_user_id uuid;
  v_display_name text;
  v_campaigns_created integer := 0;
  v_messages_created integer := 0;
  v_deliveries_created integer := 0;
  v_notifications_created integer := 0;
  v_statuses text[] := ARRAY[
    'requested',
    'payment_pending',
    'pre_authorized',
    'in_escrow',
    'delivery_submitted',
    'completed',
    'declined',
    'expired',
    'cancelled',
    'refunded',
    'disputed'
  ];
  v_idx integer;
BEGIN
  SELECT id, email, raw_user_meta_data
  INTO v_auth
  FROM auth.users
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % not found in auth.users', v_user_id;
  END IF;

  SELECT *
  INTO v_profile
  FROM public.business_profiles
  WHERE user_id = v_user_id;

  v_contact_email := COALESCE(v_auth.email, 'brand@plugoh.dev');
  v_brand_name := COALESCE(
    NULLIF(trim(v_profile.brand_name), ''),
    NULLIF(trim(v_auth.raw_user_meta_data ->> 'full_name'), ''),
    initcap(replace(split_part(v_contact_email, '@', 1), '.', ' ')),
    'Plugoh Demo Brand'
  );

  INSERT INTO public.profiles (id, email, full_name, phone, location, business_name, business_type, avatar_url)
  VALUES (
    v_user_id,
    v_contact_email,
    COALESCE(NULLIF(trim(v_auth.raw_user_meta_data ->> 'full_name'), ''), 'Demo Brand Owner'),
    '+919876543210',
    'Hyderabad',
    v_brand_name,
    'Restaurant/Cafe',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=400&fit=crop'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
    location = COALESCE(public.profiles.location, EXCLUDED.location),
    business_name = COALESCE(public.profiles.business_name, EXCLUDED.business_name),
    business_type = COALESCE(public.profiles.business_type, EXCLUDED.business_type),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'business');

  INSERT INTO public.business_profiles (
    user_id,
    brand_name,
    brand_type,
    brand_location,
    brand_summary,
    tagline,
    has_instagram_account,
    instagram_connected_at,
    ig_username,
    ig_biography,
    ig_profile_picture_url,
    ig_followers_count,
    ig_follows_count,
    ig_media_count,
    instagram_url
  )
  VALUES (
    v_user_id,
    v_brand_name,
    COALESCE(NULLIF(trim(v_profile.brand_type), ''), 'Restaurant/Cafe'),
    COALESCE(NULLIF(trim(v_profile.brand_location), ''), 'Hyderabad · Jubilee Hills'),
    COALESCE(
      NULLIF(trim(v_profile.brand_summary), ''),
      format(
        '%s is a modern local brand using Plugoh to book creators for launch reels, store visits, and product drops.',
        v_brand_name
      )
    ),
    COALESCE(NULLIF(trim(v_profile.tagline), ''), 'Creator-led campaigns, escrow-backed payouts.'),
    true,
    now() - interval '14 days',
    lower(regexp_replace(v_brand_name, '[^a-zA-Z0-9]+', '_', 'g')) || '_demo',
    format('Official Instagram for %s — specialty experiences and collabs.', v_brand_name),
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop',
    12840,
    412,
    186,
    format('https://instagram.com/%s', lower(regexp_replace(v_brand_name, '[^a-zA-Z0-9]+', '_', 'g')) || '_demo')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    brand_name = COALESCE(public.business_profiles.brand_name, EXCLUDED.brand_name),
    brand_type = COALESCE(public.business_profiles.brand_type, EXCLUDED.brand_type),
    brand_location = COALESCE(public.business_profiles.brand_location, EXCLUDED.brand_location),
    brand_summary = COALESCE(public.business_profiles.brand_summary, EXCLUDED.brand_summary),
    tagline = COALESCE(public.business_profiles.tagline, EXCLUDED.tagline),
    has_instagram_account = COALESCE(public.business_profiles.has_instagram_account, EXCLUDED.has_instagram_account),
    instagram_connected_at = COALESCE(public.business_profiles.instagram_connected_at, EXCLUDED.instagram_connected_at),
    ig_username = COALESCE(public.business_profiles.ig_username, EXCLUDED.ig_username),
    ig_biography = COALESCE(public.business_profiles.ig_biography, EXCLUDED.ig_biography),
    ig_profile_picture_url = COALESCE(public.business_profiles.ig_profile_picture_url, EXCLUDED.ig_profile_picture_url),
    ig_followers_count = COALESCE(public.business_profiles.ig_followers_count, EXCLUDED.ig_followers_count),
    ig_follows_count = COALESCE(public.business_profiles.ig_follows_count, EXCLUDED.ig_follows_count),
    ig_media_count = COALESCE(public.business_profiles.ig_media_count, EXCLUDED.ig_media_count),
    instagram_url = COALESCE(public.business_profiles.instagram_url, EXCLUDED.instagram_url);

  SELECT ip.*
  INTO v_influencer_a
  FROM public.influencer_profiles ip
  WHERE ip.is_active = true
  ORDER BY ip.follower_count DESC NULLS LAST, ip.created_at ASC
  LIMIT 1;

  IF v_influencer_a.id IS NULL THEN
    RAISE EXCEPTION 'No active influencer_profiles found. Add at least one active creator first.';
  END IF;

  SELECT ip.*
  INTO v_influencer_b
  FROM public.influencer_profiles ip
  WHERE ip.is_active = true
    AND ip.id <> v_influencer_a.id
  ORDER BY ip.follower_count DESC NULLS LAST, ip.created_at ASC
  LIMIT 1;

  DELETE FROM public.campaign_messages
  WHERE campaign_id IN (
    SELECT c.id FROM public.campaigns c
    WHERE c.business_id = v_user_id AND c.title LIKE 'Seed:%'
  );

  DELETE FROM public.deliveries
  WHERE campaign_id IN (
    SELECT c.id FROM public.campaigns c
    WHERE c.business_id = v_user_id AND c.title LIKE 'Seed:%'
  );

  DELETE FROM public.escrow_transactions
  WHERE campaign_id IN (
    SELECT c.id FROM public.campaigns c
    WHERE c.business_id = v_user_id AND c.title LIKE 'Seed:%'
  );

  DELETE FROM public.campaign_files
  WHERE campaign_id IN (
    SELECT c.id FROM public.campaigns c
    WHERE c.business_id = v_user_id AND c.title LIKE 'Seed:%'
  );

  DELETE FROM public.campaigns
  WHERE business_id = v_user_id AND title LIKE 'Seed:%';

  v_idx := 0;
  FOREACH v_status IN ARRAY v_statuses LOOP
    v_idx := v_idx + 1;

    IF v_idx % 2 = 1 OR v_influencer_b.id IS NULL THEN
      v_inf_profile_id := v_influencer_a.id;
      v_inf_user_id := v_influencer_a.user_id;
      v_display_name := COALESCE(v_influencer_a.display_name, 'Creator');
      v_price := GREATEST(COALESCE(v_influencer_a.price_per_reel, 10000), 1000);
    ELSE
      v_inf_profile_id := v_influencer_b.id;
      v_inf_user_id := v_influencer_b.user_id;
      v_display_name := COALESCE(v_influencer_b.display_name, 'Creator');
      v_price := GREATEST(COALESCE(v_influencer_b.price_per_reel, 10000), 1000);
    END IF;

    v_fee := round(v_price * 0.12, 2);
    v_total := v_price + v_fee;

    INSERT INTO public.campaigns (
      business_id,
      influencer_id,
      influencer_profile_id,
      title,
      brief,
      package_type,
      price_offered,
      advance_amount,
      business_contact_email,
      business_contact_phone,
      status,
      payment_status,
      payment_method,
      razorpay_order_id,
      razorpay_payment_id,
      platform_fee_amount,
      total_charged_amount,
      accepted_at,
      payment_captured_at,
      delivery_submitted_at,
      completed_at,
      expires_at,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id,
      v_inf_user_id,
      v_inf_profile_id,
      format('Seed: %s', v_status),
      format(
        E'Synthetic campaign for UI/testing.\nObjective: visit_place\nPackage: reel\nTiming: choose_date (%s)\nVenue: %s flagship store',
        (v_base + interval '21 days')::date,
        v_brand_name
      ),
      'reel',
      v_price,
      0,
      v_contact_email,
      v_contact_phone,
      v_status,
      CASE
        WHEN v_status IN ('in_escrow', 'delivery_submitted', 'completed', 'disputed') THEN 'paid'
        WHEN v_status = 'pre_authorized' THEN 'authorized'
        ELSE 'unpaid'
      END,
      CASE
        WHEN v_status IN ('in_escrow', 'delivery_submitted', 'completed', 'disputed', 'pre_authorized', 'payment_pending')
          THEN 'card'
        ELSE NULL
      END,
      CASE
        WHEN v_status IN ('in_escrow', 'delivery_submitted', 'completed', 'disputed', 'pre_authorized', 'payment_pending')
          THEN format('order_seed_%s', replace(v_status, ' ', '_'))
        ELSE NULL
      END,
      CASE
        WHEN v_status IN ('in_escrow', 'delivery_submitted', 'completed', 'disputed')
          THEN format('pay_seed_%s', replace(v_status, ' ', '_'))
        ELSE NULL
      END,
      v_fee,
      v_total,
      CASE
        WHEN v_status IN ('payment_pending', 'pre_authorized', 'in_escrow', 'delivery_submitted', 'completed', 'disputed')
          THEN v_base + interval '2 days'
        ELSE NULL
      END,
      CASE
        WHEN v_status IN ('in_escrow', 'delivery_submitted', 'completed', 'disputed')
          THEN v_base + interval '3 days'
        ELSE NULL
      END,
      CASE
        WHEN v_status IN ('delivery_submitted', 'completed', 'disputed')
          THEN v_base + interval '4 days' + interval '12 hours'
        ELSE NULL
      END,
      CASE
        WHEN v_status = 'completed' THEN v_base + interval '5 days' + interval '11 hours'
        ELSE NULL
      END,
      v_base + interval '14 days',
      v_base + (v_idx * interval '3 hours'),
      v_base + interval '6 days' + (v_idx * interval '2 hours')
    )
    RETURNING id INTO v_campaign_id;

    v_campaigns_created := v_campaigns_created + 1;

    INSERT INTO public.campaign_messages (campaign_id, sender_id, message_type, content, metadata, read_by, created_at)
    VALUES (
      v_campaign_id,
      v_user_id,
      'booking_card',
      format('visit place with %s', v_display_name),
      jsonb_build_object('campaignId', v_campaign_id),
      ARRAY[v_user_id]::uuid[],
      v_base + (v_idx * interval '3 hours')
    );
    v_messages_created := v_messages_created + 1;

    IF v_status IN ('in_escrow', 'completed', 'delivery_submitted') THEN
      INSERT INTO public.campaign_messages (campaign_id, sender_id, message_type, content, metadata, read_by, created_at)
      VALUES
        (
          v_campaign_id, v_user_id, 'text',
          format('Hi %s — excited to collaborate on the %s reel.', split_part(v_display_name, '|', 1), v_brand_name),
          '{}'::jsonb, ARRAY[v_user_id]::uuid[], v_base + interval '2 days' + (v_idx * interval '15 minutes')
        ),
        (
          v_campaign_id, v_inf_user_id, 'text',
          'Sounds great. I can shoot this weekend and share a draft link in chat.',
          '{}'::jsonb, ARRAY[v_inf_user_id]::uuid[], v_base + interval '2 days' + interval '45 minutes'
        );
      v_messages_created := v_messages_created + 2;
    END IF;

    IF v_status IN ('delivery_submitted', 'completed', 'disputed') THEN
      INSERT INTO public.deliveries (
        campaign_id, submitted_by, content_url, notes,
        submitted_at, approved_at, approved_by, dispute_reason, disputed_at
      )
      VALUES (
        v_campaign_id,
        v_inf_user_id,
        'https://www.instagram.com/reel/demo-delivery-link',
        'Draft reel shared for review.',
        v_base + interval '4 days' + interval '12 hours',
        CASE WHEN v_status = 'completed' THEN v_base + interval '5 days' ELSE NULL END,
        CASE WHEN v_status = 'completed' THEN v_user_id ELSE NULL END,
        CASE WHEN v_status = 'disputed' THEN 'Footage does not match agreed brief.' ELSE NULL END,
        CASE WHEN v_status = 'disputed' THEN v_base + interval '4 days' + interval '18 hours' ELSE NULL END
      );
      v_deliveries_created := v_deliveries_created + 1;
    END IF;
  END LOOP;

  DELETE FROM public.notifications
  WHERE user_id = v_user_id
    AND COALESCE(data ->> 'seed', 'false') = 'true';

  INSERT INTO public.notifications (user_id, type, data, read, created_at)
  SELECT
    v_user_id,
    n.type,
    jsonb_build_object(
      'seed', true,
      'campaignTitle', c.title,
      'campaignId', c.id,
      'amount', c.price_offered,
      'influencerName', COALESCE(ip.display_name, ip.ig_username, 'Creator')
    ),
    (n.type IN ('booking_completed')),
    v_base + n.notify_offset
  FROM (
    VALUES
      ('payment_secured', interval '3 days'),
      ('delivery_submitted', interval '4 days'),
      ('booking_completed', interval '5 days')
  ) AS n(type, notify_offset)
  JOIN public.campaigns c ON c.business_id = v_user_id AND c.title = 'Seed: completed'
  JOIN public.influencer_profiles ip ON ip.id = c.influencer_profile_id;

  GET DIAGNOSTICS v_notifications_created = ROW_COUNT;

  RAISE NOTICE 'Done. user=% brand=% campaigns=% messages=% deliveries=% notifications=%',
    v_user_id, v_brand_name, v_campaigns_created, v_messages_created, v_deliveries_created, v_notifications_created;
END $$;

-- Optional: verify after run
-- SELECT * FROM public.business_profiles WHERE user_id = 'YOUR-UUID';
-- SELECT title, status, price_offered FROM public.campaigns WHERE business_id = 'YOUR-UUID' ORDER BY title;
