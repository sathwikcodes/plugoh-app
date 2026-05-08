import { Hono } from "hono";
import type { EnvConfig } from "./config/env.js";
import { readEnv } from "./config/env.js";
import { createSupabaseAuthVerifier, type AuthVerifier } from "./middleware/auth.js";
import { SupabaseDataStore, type DataStore } from "./repositories/data-store.js";
import type { ProviderBundle } from "./services/marketplace.js";
import type { AppEnv } from "./types.js";
import type { RouteDeps } from "./modules/deps.js";
import { applyGlobalMiddleware, buildDeps, createRateLimiters, mountDomainRoutes } from "./modules/bootstrap.js";
import {
  authOrCron,
  claimIdempotency,
  createDefaultProviders,
  createRateLimitStore,
  requireIdempotencyKey,
  requireRoleValue,
  requireUser,
  scopedReadServices,
} from "./modules/runtime.js";

export type AppOptions = {
  config?: Partial<EnvConfig>;
  store?: DataStore;
  authVerifier?: AuthVerifier;
  providers?: ProviderBundle;
};

export function createApp(options: AppOptions = {}) {
  const config: EnvConfig = { ...readEnv(), ...options.config };
  const store = options.store ?? new SupabaseDataStore(config);
  const authVerifier = options.authVerifier ?? createSupabaseAuthVerifier(config);
  const providers = options.providers ?? createDefaultProviders(config);
  const app = new Hono<AppEnv>();

  applyGlobalMiddleware(app, config);
  const { authDefaultRateLimit, paymentRateLimit, publicDiscoveryRateLimit } = createRateLimiters(
    app,
    config,
    createRateLimitStore,
  );

  const deps: RouteDeps = buildDeps(
    { config, store, providers },
    {
      authVerifier,
      requireUser,
      requireRoleValue,
      claimIdempotency,
      requireIdempotencyKey,
      authOrCron,
      scopedReadServices: (c) => scopedReadServices(c, store, providers, config),
      authDefaultRateLimit,
      paymentRateLimit,
      publicDiscoveryRateLimit,
    },
  );

  mountDomainRoutes(app, deps);
  return app;
}

export default createApp;
