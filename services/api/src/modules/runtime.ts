import type { UserRole } from '@plugoh/contracts';
import type { Context } from 'hono';
import { MemoryStore } from 'hono-rate-limiter';
import {
  ExpoPushProvider,
  ExternalAiProvider,
  GoogleGeocodingProvider,
  GooglePlacesProvider,
  GoogleWeatherProvider,
  MetaInstagramProvider,
  RazorpayProvider,
  ResendEmailProvider,
  SupabaseStorageProvider,
  type AiProvider,
  type EmailProvider,
  type GeocodingProvider,
  type InstagramProvider,
  type PaymentProvider,
  type PlacesProvider,
  type PushProvider,
  type StorageProvider,
  type WeatherProvider,
} from '../clients/providers.js';
import type { EnvConfig } from '../config/env.js';
import { badRequest, forbidden, unauthorized } from '../core/errors.js';
import type { AuthVerifier } from '../middleware/auth.js';
import { SupabaseDataStore, type DataStore } from '../repositories/data-store.js';
import { createServices, type ProviderBundle } from '../services/marketplace.js';
import type { AppEnv, AuthUser } from '../types.js';

export function createRateLimitStore(config: EnvConfig) {
  if (config.redisConnectionString) {
    // Redis wiring is deferred to infrastructure rollout; memory fallback remains active.
  }
  return new MemoryStore();
}

export function createDefaultProviders(config: EnvConfig): ProviderBundle {
  const providers: {
    payment?: PaymentProvider;
    email?: EmailProvider;
    geocoding?: GeocodingProvider;
    places?: PlacesProvider;
    weather?: WeatherProvider;
    instagram?: InstagramProvider;
    storage?: StorageProvider;
    ai?: AiProvider;
    push?: PushProvider;
  } = {};
  if (config.razorpayKeyId && config.razorpayKeySecret)
    providers.payment = new RazorpayProvider(config);
  if (config.resendApiKey) providers.email = new ResendEmailProvider(config);
  if (config.googleMapsGeocodingApiKey) providers.geocoding = new GoogleGeocodingProvider(config);
  if (config.googleMapsGeocodingApiKey) providers.places = new GooglePlacesProvider(config);
  if (config.googleMapsWeatherApiKey) providers.weather = new GoogleWeatherProvider(config);
  if (config.instagramClientId && config.instagramAppSecret && config.instagramRedirectUri)
    providers.instagram = new MetaInstagramProvider(config);
  if (config.supabaseUrl && config.supabaseServiceRoleKey)
    providers.storage = new SupabaseStorageProvider(config);
  providers.ai = new ExternalAiProvider(config);
  providers.push = new ExpoPushProvider();
  return providers;
}

export function scopedReadServices(
  c: Context<AppEnv>,
  store: DataStore,
  providers: ProviderBundle,
  config: EnvConfig,
) {
  if (store instanceof SupabaseDataStore) {
    const token = c.get('authToken');
    if (token) {
      return createServices(store.createUserScopedStore(token), providers, config);
    }
  }
  return createServices(store, providers, config);
}

export function requireUser(c: Context<AppEnv>) {
  const user = c.get('user');
  if (!user) throw unauthorized();
  return user;
}

export function requireRoleValue(c: Context<AppEnv>) {
  const role = c.get('role');
  if (!role) throw forbidden('User role not found');
  return role;
}

export function requireIdempotencyKey(header: string | undefined) {
  const key = header?.trim();
  if (!key) throw badRequest('MISSING_IDEMPOTENCY_KEY', 'Idempotency-Key header is required');
  return key;
}

export async function claimIdempotency(store: DataStore, header: string | undefined) {
  const key = requireIdempotencyKey(header);
  let result: { response: unknown };
  try {
    result = await runIdempotencyRpc(store, key, null);
  } catch (error) {
    if (!isUnsupportedNullIdempotencyClaim(error)) throw error;
    return null;
  }
  return result.response;
}

export async function storeIdempotency(
  store: DataStore,
  header: string | undefined,
  response: unknown,
) {
  const key = requireIdempotencyKey(header);
  await runIdempotencyRpc(store, key, response);
}

async function runIdempotencyRpc(store: DataStore, key: string, response: unknown) {
  try {
    return await store.rpc<{ response: unknown }>('claim_idempotency', {
      p_key: key,
      p_response: response,
      p_scope: 'global',
      p_request_hash: key,
    });
  } catch (error) {
    if (!isMissingScopedIdempotencyRpc(error)) throw error;
  }
  return store.rpc<{ response: unknown }>('claim_idempotency', {
    p_key: key,
    p_response: response,
  });
}

function isMissingScopedIdempotencyRpc(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    code === 'RPC_ERROR' &&
    typeof message === 'string' &&
    message.includes('claim_idempotency') &&
    message.includes('p_scope')
  );
}

function isUnsupportedNullIdempotencyClaim(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    code === '23502' &&
    typeof message === 'string' &&
    message.includes('idempotency_keys') &&
    message.includes('response')
  );
}

export async function authOrCron(
  c: Context<AppEnv>,
  store: DataStore,
  verifyToken: AuthVerifier,
  cronSecret?: string,
): Promise<AuthUser | undefined> {
  if (cronSecret && c.req.header('x-cron-secret') === cronSecret) return undefined;
  const header = c.req.header('authorization');
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw unauthorized();
  const user = await verifyToken(token);
  const role =
    (await store.findOne<{ role: UserRole }>('user_roles', { eq: { user_id: user.id } }))?.role ??
    user.app_metadata?.role;
  if (role !== 'business') throw forbidden('business role required');
  return user;
}
