import type { UserRole } from '@plugoh/contracts';
import { createClient } from '@supabase/supabase-js';
import { createMiddleware } from 'hono/factory';
import type { EnvConfig } from '../config/env.js';
import { AppError, forbidden, serviceUnavailable, unauthorized } from '../core/errors.js';
import type { DataStore } from '../repositories/data-store.js';
import type { AppEnv, AuthUser } from '../types.js';

export type AuthVerifier = (token: string) => Promise<AuthUser>;

const AUTH_CACHE_TTL_MS = 60_000;
const AUTH_RETRY_DELAYS_MS = [250, 750];

type CachedAuthUser = {
  user: AuthUser;
  expiresAt: number;
};

function cloneAuthUser(user: AuthUser): AuthUser {
  return {
    ...user,
    ...(user.app_metadata ? { app_metadata: { ...user.app_metadata } } : {}),
  };
}

function isTransientAuthNetworkError(error: unknown) {
  if (error instanceof AppError) return false;
  const cause = error && typeof error === 'object' ? (error as { cause?: unknown }).cause : null;
  const code = cause && typeof cause === 'object' ? (cause as { code?: unknown }).code : undefined;
  if (
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN'
  ) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /fetch failed|connect timeout|network/i.test(message);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createSupabaseAuthVerifier(config: EnvConfig): AuthVerifier {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return () => Promise.reject(unauthorized('Supabase auth is not configured'));
  }
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey);
  const cache = new Map<string, CachedAuthUser>();
  return async (token) => {
    const now = Date.now();
    const cached = cache.get(token);
    if (cached && cached.expiresAt > now) {
      return cloneAuthUser(cached.user);
    }

    let lastError: unknown;
    for (let attempt = 0; attempt <= AUTH_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const { data } = await client.auth.getUser(token);
        if (!data.user) throw unauthorized('Invalid bearer token');
        const user: AuthUser = {
          id: data.user.id,
          ...(data.user.email ? { email: data.user.email } : {}),
        };
        const claimRole = data.user.app_metadata.role;
        if (claimRole === 'business' || claimRole === 'influencer') {
          user.app_metadata = { role: claimRole };
        }
        cache.set(token, { user: cloneAuthUser(user), expiresAt: now + AUTH_CACHE_TTL_MS });
        return user;
      } catch (error) {
        lastError = error;
        if (!isTransientAuthNetworkError(error)) throw error;
        const retryDelay = AUTH_RETRY_DELAYS_MS[attempt];
        if (retryDelay == null) break;
        await wait(retryDelay);
      }
    }
    throw serviceUnavailable(
      'AUTH_PROVIDER_UNAVAILABLE',
      'Authentication provider is temporarily unavailable. Please retry.',
      lastError instanceof Error ? lastError.message : undefined,
    );
  };
}

export function requireAuth(store: DataStore, verifyToken: AuthVerifier) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const header = c.req.header('authorization');
    const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw unauthorized();
    const user = await verifyToken(token);
    const roleRow = await store.findOne<{ role: UserRole }>('user_roles', {
      eq: { user_id: user.id },
    });
    const roleFromClaim = user.app_metadata?.role;
    c.set('user', user);
    c.set('authToken', token);
    if (roleRow?.role) {
      c.set('role', roleRow.role);
    } else if (roleFromClaim) {
      c.set('role', roleFromClaim);
    }
    await next();
  });
}

export function requireRole(role: UserRole) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!c.get('user')) throw unauthorized();
    if (c.get('role') !== role) throw forbidden(`${role} role required`);
    await next();
  });
}

export function requireSecret(headerName: string, expected?: string, label = 'secret') {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!expected) throw forbidden(`${label} is not configured`);
    if (c.req.header(headerName) !== expected) throw forbidden(`Invalid ${label}`);
    await next();
  });
}
