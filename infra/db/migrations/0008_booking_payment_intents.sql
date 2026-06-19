-- Durable booking payment intents for Razorpay checkout recovery.
-- The API creates an intent before opening checkout, then verifies payment against it.

create table if not exists public.booking_payment_intents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  influencer_profile_id uuid not null,
  package_type text not null,
  booking_payload jsonb not null,
  provider text not null default 'razorpay',
  provider_order_id text not null,
  provider_payment_id text,
  payment_method text,
  status text not null default 'created',
  price_offered_paise integer not null,
  platform_fee_paise integer not null,
  total_charged_paise integer not null,
  currency text not null default 'INR',
  campaign_id uuid,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  constraint booking_payment_intents_provider_order_uidx unique (provider, provider_order_id),
  constraint booking_payment_intents_status_check check (
    status in ('created', 'authorized', 'completed', 'failed', 'cancelled')
  )
);

create index if not exists booking_payment_intents_business_status_idx
  on public.booking_payment_intents (business_id, status, created_at desc);

create index if not exists booking_payment_intents_campaign_idx
  on public.booking_payment_intents (campaign_id)
  where campaign_id is not null;

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

  if p_response is null then
    return jsonb_build_object('response', null);
  end if;

  insert into public.idempotency_keys(key, response) values (p_key, p_response);
  return jsonb_build_object('response', null);
end;
$$;
