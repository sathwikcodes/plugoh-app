import crypto from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

const businessId = '11111111-1111-4111-8111-111111111111';
const influencerId = '22222222-2222-4222-8222-222222222222';

let container: StartedPostgreSqlContainer;
let pool: Pool;
let runtimeAvailable = true;

beforeAll(async () => {
  try {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    pool = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
      max: 50,
    });
  } catch {
    runtimeAvailable = false;
    return;
  }

  await pool.query(`
    do $$
    begin
      create role authenticated;
    exception
      when duplicate_object then null;
    end $$;
    do $$
    begin
      create role anon;
    exception
      when duplicate_object then null;
    end $$;
    do $$
    begin
      create role service_role;
    exception
      when duplicate_object then null;
    end $$;
    -- Supabase manages the auth schema in real environments; the throwaway test
    -- container does not, so stub the objects migrations reference (e.g. the
    -- auth.users FK in 0007). Seed the test users so FK-backed inserts succeed.
    create schema if not exists auth;
    create table if not exists auth.users (
      id uuid primary key
    );
    insert into auth.users (id)
    values
      ('11111111-1111-4111-8111-111111111111'),
      ('22222222-2222-4222-8222-222222222222')
    on conflict (id) do nothing;
    create table if not exists public.campaigns (
      id uuid primary key,
      business_id uuid not null,
      influencer_id uuid not null,
      status text not null,
      payment_status text,
      payment_method text,
      razorpay_order_id text,
      razorpay_payment_id text,
      price_offered numeric default 0,
      platform_fee_amount numeric default 0,
      total_charged_amount numeric default 0,
      accepted_at timestamptz,
      expires_at timestamptz,
      payment_captured_at timestamptz,
      delivery_submitted_at timestamptz,
      completed_at timestamptz,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    create table if not exists public.campaign_messages (
      id uuid default gen_random_uuid() primary key,
      campaign_id uuid not null,
      sender_id uuid not null,
      message_type text not null default 'text',
      content text,
      metadata jsonb,
      created_at timestamptz default now()
    );
    create table if not exists public.campaign_message_reads (
      message_id uuid not null,
      user_id uuid not null,
      read_at timestamptz default now(),
      primary key (message_id, user_id)
    );
    create table if not exists public.escrow_transactions (
      id uuid default gen_random_uuid() primary key,
      campaign_id uuid not null,
      type text not null,
      amount_paise bigint,
      platform_fee_paise bigint,
      razorpay_order_id text,
      razorpay_payment_id text,
      status text,
      created_at timestamptz default now()
    );
    create table if not exists public.deliveries (
      id uuid default gen_random_uuid() primary key,
      campaign_id uuid not null unique,
      submitted_by uuid not null,
      content_url text not null,
      notes text,
      submitted_at timestamptz default now(),
      approved_at timestamptz,
      approved_by uuid,
      updated_at timestamptz default now(),
      created_at timestamptz default now()
    );
  `);

  const migrationsDir = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../../infra/db/migrations',
  );
  const migrationFiles = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  for (const migrationFile of migrationFiles) {
    const migrationSql = readFileSync(resolve(migrationsDir, migrationFile), 'utf8');
    await pool.query(migrationSql);
  }
}, 120_000);

afterAll(async () => {
  if (!runtimeAvailable) return;
  await pool?.end();
  await container?.stop();
});

function campaignId() {
  return crypto.randomUUID();
}

async function insertCampaign(id: string, status: string, overrides: Record<string, unknown> = {}) {
  await pool.query(
    `
      insert into public.campaigns (
        id, business_id, influencer_id, status, payment_status, payment_method,
        razorpay_order_id, razorpay_payment_id, price_offered, platform_fee_amount, total_charged_amount
      )
      values ($1, $2, $3, $4, 'unpaid', 'card', 'order_1', null, 10000, 1200, 11200)
    `,
    [id, businessId, influencerId, status],
  );

  for (const [key, value] of Object.entries(overrides)) {
    await pool.query(`update public.campaigns set ${key} = $2 where id = $1`, [id, value]);
  }
}

describe('campaign transition race protection', () => {
  it('allows exactly one winner for 50 concurrent accept calls', async () => {
    if (!runtimeAvailable) return;
    const id = campaignId();
    await insertCampaign(id, 'requested');

    const results = await Promise.allSettled(
      Array.from({ length: 50 }, () =>
        pool.query('select accept_campaign($1::uuid, $2::uuid)', [id, influencerId]),
      ),
    );

    const successes = results.filter((result) => result.status === 'fulfilled');
    const failures = results.filter((result) => result.status === 'rejected');
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(49);
    for (const failure of failures) {
      expect(String(failure.reason?.message ?? '')).toContain('ILLEGAL_TRANSITION');
    }
  });

  it('makes concurrent accept and decline mutually exclusive', async () => {
    if (!runtimeAvailable) return;
    const id = campaignId();
    await insertCampaign(id, 'requested');

    const [accepted, declined] = await Promise.allSettled([
      pool.query('select accept_campaign($1::uuid, $2::uuid)', [id, influencerId]),
      pool.query('select decline_campaign($1::uuid, $2::uuid)', [id, influencerId]),
    ]);

    const fulfilledCount = [accepted, declined].filter(
      (result) => result.status === 'fulfilled',
    ).length;
    const rejectedCount = [accepted, declined].filter(
      (result) => result.status === 'rejected',
    ).length;
    expect(fulfilledCount).toBe(1);
    expect(rejectedCount).toBe(1);
  });

  it('keeps verify_escrow idempotent and replays idempotency response', async () => {
    if (!runtimeAvailable) return;
    const id = campaignId();
    await insertCampaign(id, 'payment_pending', { razorpay_order_id: 'order_x' });

    await pool.query('select verify_escrow($1::uuid, $2::uuid, $3::text, $4::text)', [
      id,
      businessId,
      'pay_x',
      'card',
    ]);
    await pool.query('select verify_escrow($1::uuid, $2::uuid, $3::text, $4::text)', [
      id,
      businessId,
      'pay_x',
      'card',
    ]);

    const escrowCount = await pool.query(
      "select count(*)::int as count from public.escrow_transactions where campaign_id = $1 and type = 'escrow_lock'",
      [id],
    );
    expect(escrowCount.rows[0]?.count).toBe(1);

    const first = await pool.query('select claim_idempotency($1::text, $2::jsonb) as payload', [
      'idem-1',
      JSON.stringify({ ok: true }),
    ]);
    const replay = await pool.query('select claim_idempotency($1::text, $2::jsonb) as payload', [
      'idem-1',
      JSON.stringify({ ok: false }),
    ]);

    expect(first.rows[0]?.payload?.response).toBeNull();
    expect(replay.rows[0]?.payload?.response).toEqual({ ok: true });
  });
});
