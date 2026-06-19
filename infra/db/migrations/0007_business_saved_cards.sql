create table if not exists public.business_saved_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_card_id text,
  provider_payment_id text,
  brand text,
  network text,
  card_type text,
  issuer text,
  last4 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_card_id)
);

create index if not exists business_saved_cards_user_updated_idx
  on public.business_saved_cards (user_id, updated_at desc);
