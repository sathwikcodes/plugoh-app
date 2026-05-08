import { createClient } from "@supabase/supabase-js";
import { createMiddleware } from "hono/factory";
import type { UserRole } from "@plugoh/contracts";
import type { EnvConfig } from "../config/env.js";
import { forbidden, unauthorized } from "../core/errors.js";
import type { DataStore } from "../repositories/data-store.js";
import type { AppEnv, AuthUser } from "../types.js";

export type AuthVerifier = (token: string) => Promise<AuthUser>;

export function createSupabaseAuthVerifier(config: EnvConfig): AuthVerifier {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return async () => {
      throw unauthorized("Supabase auth is not configured");
    };
  }
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey);
  return async (token) => {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) throw unauthorized("Invalid bearer token");
    const user: AuthUser = {
      id: data.user.id,
      ...(data.user.email ? { email: data.user.email } : {}),
    };
    const claimRole = data.user.app_metadata?.role;
    if (claimRole === "business" || claimRole === "influencer") {
      user.app_metadata = { role: claimRole };
    }
    return user;
  };
}

export function requireAuth(store: DataStore, verifyToken: AuthVerifier) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const header = c.req.header("authorization");
    const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw unauthorized();
    const user = await verifyToken(token);
    const roleFromClaim = user.app_metadata?.role;
    const roleRow = roleFromClaim ? null : await store.findOne<{ role: UserRole }>("user_roles", { eq: { user_id: user.id } });
    c.set("user", user);
    c.set("authToken", token);
    if (roleFromClaim) {
      c.set("role", roleFromClaim);
    } else if (roleRow?.role) {
      c.set("role", roleRow.role);
    }
    await next();
  });
}

export function requireRole(role: UserRole) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!c.get("user")) throw unauthorized();
    if (c.get("role") !== role) throw forbidden(`${role} role required`);
    await next();
  });
}

export function requireSecret(headerName: string, expected?: string, label = "secret") {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!expected) throw forbidden(`${label} is not configured`);
    if (c.req.header(headerName) !== expected) throw forbidden(`Invalid ${label}`);
    await next();
  });
}
