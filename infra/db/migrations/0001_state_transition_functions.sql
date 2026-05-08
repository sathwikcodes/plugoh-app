-- Production hardening migration: transactional campaign transitions + idempotency claims.
-- SECURITY DEFINER is used so RPCs can be executed from restricted clients while preserving explicit guards.

create table if not exists public.idempotency_keys (
  key text primary key,
  response jsonb not null,
  created_at timestamptz not null default now()
);

create unique index if not exists escrow_lock_campaign_payment_uidx
  on public.escrow_transactions (campaign_id, type, razorpay_payment_id)
  where type = 'escrow_lock' and razorpay_payment_id is not null;

create or replace function public.claim_idempotency(p_key text, p_response jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  existing jsonb;
begin
  select response into existing from public.idempotency_keys where key = p_key;
  if existing is not null then
    return jsonb_build_object('response', existing);
  end if;

  insert into public.idempotency_keys(key, response) values (p_key, p_response);
  return jsonb_build_object('response', null);
end;
$$;

create or replace function public.accept_campaign(p_campaign_id uuid, p_actor uuid)
returns public.campaigns
language plpgsql
security definer
as $$
declare
  v_campaign public.campaigns;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'code:NOT_FOUND:Campaign not found';
  end if;
  if v_campaign.influencer_id <> p_actor then
    raise exception using errcode = 'P0001', message = 'code:FORBIDDEN:Influencer on campaign required';
  end if;
  if v_campaign.status not in ('requested', 'payment_pending', 'pre_authorized') then
    raise exception using errcode = 'P0001', message = format('code:ILLEGAL_TRANSITION:illegal_transition:%s->accepted', v_campaign.status);
  end if;

  if v_campaign.status = 'pre_authorized' then
    update public.campaigns
      set status = 'in_escrow',
          payment_status = 'paid',
          accepted_at = now(),
          payment_captured_at = now(),
          updated_at = now()
    where id = p_campaign_id
    returning * into v_campaign;

    insert into public.escrow_transactions (
      campaign_id, type, amount_paise, platform_fee_paise,
      razorpay_order_id, razorpay_payment_id, status, created_at
    )
    values (
      p_campaign_id,
      'escrow_lock',
      round(coalesce(v_campaign.total_charged_amount, 0) * 100),
      round(coalesce(v_campaign.platform_fee_amount, 0) * 100),
      v_campaign.razorpay_order_id,
      v_campaign.razorpay_payment_id,
      'success',
      now()
    )
    on conflict do nothing;
  else
    update public.campaigns
      set status = 'payment_pending',
          expires_at = now() + interval '24 hours',
          accepted_at = now(),
          updated_at = now()
    where id = p_campaign_id
    returning * into v_campaign;
  end if;

  return v_campaign;
end;
$$;

create or replace function public.decline_campaign(p_campaign_id uuid, p_actor uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_campaign public.campaigns;
  v_should_refund boolean := false;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'code:NOT_FOUND:Campaign not found';
  end if;
  if v_campaign.influencer_id <> p_actor then
    raise exception using errcode = 'P0001', message = 'code:FORBIDDEN:Influencer on campaign required';
  end if;
  if v_campaign.status not in ('requested', 'payment_pending', 'pre_authorized') then
    raise exception using errcode = 'P0001', message = format('code:ILLEGAL_TRANSITION:illegal_transition:%s->declined', v_campaign.status);
  end if;

  v_should_refund := (
    v_campaign.status = 'pre_authorized'
    and v_campaign.payment_method = 'upi'
    and v_campaign.razorpay_payment_id is not null
  );

  update public.campaigns
    set status = 'declined', updated_at = now()
  where id = p_campaign_id
  returning * into v_campaign;

  return jsonb_build_object(
    'campaign', to_jsonb(v_campaign),
    'should_refund', v_should_refund
  );
end;
$$;

create or replace function public.verify_escrow(
  p_campaign_id uuid,
  p_actor uuid,
  p_payment_id text,
  p_method text
)
returns public.campaigns
language plpgsql
security definer
as $$
declare
  v_campaign public.campaigns;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'code:NOT_FOUND:Campaign not found';
  end if;
  if v_campaign.business_id <> p_actor then
    raise exception using errcode = 'P0001', message = 'code:FORBIDDEN:Business on campaign required';
  end if;
  if v_campaign.status not in ('payment_pending', 'in_escrow') then
    raise exception using errcode = 'P0001', message = format('code:ILLEGAL_TRANSITION:illegal_transition:%s->in_escrow', v_campaign.status);
  end if;

  update public.campaigns
    set status = 'in_escrow',
        payment_status = 'paid',
        payment_method = p_method,
        razorpay_payment_id = p_payment_id,
        payment_captured_at = coalesce(payment_captured_at, now()),
        updated_at = now()
  where id = p_campaign_id
    and (payment_status <> 'paid' or razorpay_payment_id <> p_payment_id)
  returning * into v_campaign;

  if v_campaign is null then
    select * into v_campaign from public.campaigns where id = p_campaign_id;
  end if;

  insert into public.escrow_transactions (
    campaign_id, type, amount_paise, platform_fee_paise,
    razorpay_order_id, razorpay_payment_id, status, created_at
  )
  values (
    p_campaign_id,
    'escrow_lock',
    round(coalesce(v_campaign.total_charged_amount, 0) * 100),
    round(coalesce(v_campaign.platform_fee_amount, 0) * 100),
    v_campaign.razorpay_order_id,
    p_payment_id,
    'success',
    now()
  )
  on conflict do nothing;

  return v_campaign;
end;
$$;

create or replace function public.submit_delivery(
  p_campaign_id uuid,
  p_actor uuid,
  p_storage_path text,
  p_notes text
)
returns public.campaigns
language plpgsql
security definer
as $$
declare
  v_campaign public.campaigns;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'code:NOT_FOUND:Campaign not found';
  end if;
  if v_campaign.influencer_id <> p_actor then
    raise exception using errcode = 'P0001', message = 'code:FORBIDDEN:Influencer on campaign required';
  end if;
  if v_campaign.status <> 'in_escrow' then
    raise exception using errcode = 'P0001', message = format('code:ILLEGAL_TRANSITION:illegal_transition:%s->delivery_submitted', v_campaign.status);
  end if;

  insert into public.deliveries (
    campaign_id, submitted_by, content_url, notes, submitted_at, created_at, updated_at
  )
  values (p_campaign_id, p_actor, p_storage_path, p_notes, now(), now(), now());

  update public.campaigns
    set status = 'delivery_submitted', delivery_submitted_at = now(), updated_at = now()
  where id = p_campaign_id and status = 'in_escrow'
  returning * into v_campaign;

  if not found then
    raise exception using errcode = 'P0001', message = 'code:ILLEGAL_TRANSITION:illegal_transition:in_escrow->delivery_submitted';
  end if;

  return v_campaign;
end;
$$;

create or replace function public.approve_delivery(p_campaign_id uuid, p_actor uuid)
returns public.campaigns
language plpgsql
security definer
as $$
declare
  v_campaign public.campaigns;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'code:NOT_FOUND:Campaign not found';
  end if;
  if v_campaign.business_id <> p_actor then
    raise exception using errcode = 'P0001', message = 'code:FORBIDDEN:Business on campaign required';
  end if;
  if v_campaign.status <> 'delivery_submitted' then
    raise exception using errcode = 'P0001', message = format('code:ILLEGAL_TRANSITION:illegal_transition:%s->completed', v_campaign.status);
  end if;

  update public.deliveries
    set approved_at = now(), approved_by = p_actor, updated_at = now()
  where campaign_id = p_campaign_id;

  update public.campaigns
    set status = 'completed', completed_at = coalesce(completed_at, now()), updated_at = now()
  where id = p_campaign_id and status = 'delivery_submitted'
  returning * into v_campaign;

  if not found then
    raise exception using errcode = 'P0001', message = 'code:ILLEGAL_TRANSITION:illegal_transition:delivery_submitted->completed';
  end if;

  return v_campaign;
end;
$$;

create or replace function public.release_escrow(p_campaign_id uuid, p_actor uuid default null)
returns public.campaigns
language plpgsql
security definer
as $$
declare
  v_campaign public.campaigns;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'code:NOT_FOUND:Campaign not found';
  end if;
  if p_actor is not null and v_campaign.business_id <> p_actor then
    raise exception using errcode = 'P0001', message = 'code:FORBIDDEN:Business on campaign required';
  end if;
  if v_campaign.status not in ('delivery_submitted', 'completed') then
    raise exception using errcode = 'P0001', message = format('code:ILLEGAL_TRANSITION:illegal_transition:%s->completed', v_campaign.status);
  end if;

  update public.campaigns
    set status = 'completed', completed_at = coalesce(completed_at, now()), updated_at = now()
  where id = p_campaign_id
  returning * into v_campaign;

  return v_campaign;
end;
$$;
