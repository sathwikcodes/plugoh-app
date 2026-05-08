import { MemoryStore } from "hono-rate-limiter";
import type { Context } from "hono";
import type { UserRole } from "@plugoh/contracts";
import {
  ExternalAiProvider,
  MetaInstagramProvider,
  RazorpayProvider,
  ResendEmailProvider,
  SupabaseStorageProvider,
  type AiProvider,
  type EmailProvider,
  type InstagramProvider,
  type PaymentProvider,
  type StorageProvider,
} from "../clients/providers.js";
import type { EnvConfig } from "../config/env.js";
import { badRequest, forbidden, unauthorized } from "../core/errors.js";
import type { AuthVerifier } from "../middleware/auth.js";
import { SupabaseDataStore, type DataStore } from "../repositories/data-store.js";
import { createServices, type ProviderBundle } from "../services/marketplace.js";
import type { AppEnv, AuthUser } from "../types.js";

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
    instagram?: InstagramProvider;
    storage?: StorageProvider;
    ai?: AiProvider;
  } = {};
  if (config.razorpayKeyId && config.razorpayKeySecret) providers.payment = new RazorpayProvider(config);
  if (config.resendApiKey) providers.email = new ResendEmailProvider(config);
  if (config.instagramClientId && config.instagramAppSecret && config.instagramRedirectUri) providers.instagram = new MetaInstagramProvider(config);
  if (config.supabaseUrl && config.supabaseServiceRoleKey) providers.storage = new SupabaseStorageProvider(config);
  providers.ai = new ExternalAiProvider(config);
  return providers;
}

export function scopedReadServices(c: Context<AppEnv>, store: DataStore, providers: ProviderBundle, config: EnvConfig) {
  if (store instanceof SupabaseDataStore) {
    const token = c.get("authToken");
    if (token) {
      return createServices(store.createUserScopedStore(token), providers, config);
    }
  }
  return createServices(store, providers, config);
}

export function requireUser(c: Context<AppEnv>) {
  const user = c.get("user");
  if (!user) throw unauthorized();
  return user;
}

export function requireRoleValue(c: Context<AppEnv>) {
  const role = c.get("role");
  if (!role) throw forbidden("User role not found");
  return role;
}

export function requireIdempotencyKey(header: string | undefined) {
  const key = header?.trim();
  if (!key) throw badRequest("MISSING_IDEMPOTENCY_KEY", "Idempotency-Key header is required");
  return key;
}

export async function claimIdempotency(store: DataStore, header: string | undefined) {
  const key = requireIdempotencyKey(header);
  const result = await store.rpc<{ response: unknown | null }>("claim_idempotency", {
    p_key: key,
    p_response: null,
  });
  return result.response;
}

export async function authOrCron(c: Context<AppEnv>, store: DataStore, verifyToken: AuthVerifier, cronSecret?: string): Promise<AuthUser | undefined> {
  if (cronSecret && c.req.header("x-cron-secret") === cronSecret) return undefined;
  const header = c.req.header("authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw unauthorized();
  const user = await verifyToken(token);
  const role = user.app_metadata?.role ?? (await store.findOne<{ role: UserRole }>("user_roles", { eq: { user_id: user.id } }))?.role;
  if (role !== "business") throw forbidden("business role required");
  return user;
}
