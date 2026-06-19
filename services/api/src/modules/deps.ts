import type { Context } from 'hono';
import type { UserRole } from '@plugoh/contracts';
import type { EnvConfig } from '../config/env.js';
import type { AuthVerifier } from '../middleware/auth.js';
import type { DataStore } from '../repositories/data-store.js';
import type { ProviderBundle, Services } from '../services/marketplace.js';
import type { AppEnv, AuthUser } from '../types.js';

export type ScopedServicesFactory = (c: Context<AppEnv>) => Services;

export type RouteDeps = {
  store: DataStore;
  authVerifier: AuthVerifier;
  services: Services;
  providers: ProviderBundle;
  config: EnvConfig;
  authDefaultRateLimit: any;
  paymentRateLimit: any;
  publicDiscoveryRateLimit: any;
  scopedReadServices: ScopedServicesFactory;
  requireUser: (c: Context<AppEnv>) => AuthUser;
  requireRoleValue: (c: Context<AppEnv>) => UserRole;
  claimIdempotency: (store: DataStore, header: string | undefined) => Promise<unknown>;
  storeIdempotency: (
    store: DataStore,
    header: string | undefined,
    response: unknown,
  ) => Promise<void>;
  requireIdempotencyKey: (header: string | undefined) => string;
  authOrCron: (
    c: Context<AppEnv>,
    store: DataStore,
    verifyToken: AuthVerifier,
    cronSecret?: string,
  ) => Promise<AuthUser | undefined>;
};
