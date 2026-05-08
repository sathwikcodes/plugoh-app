import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { configurationError } from "../core/errors.js";

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = resolve(apiRoot, "../..");

for (const path of [
  resolve(apiRoot, ".env"),
  resolve(apiRoot, ".env.local"),
  resolve(repoRoot, ".env"),
  resolve(repoRoot, ".env.local"),
]) {
  if (existsSync(path)) loadDotenv({ path, override: false });
}

export type EnvConfig = {
  port: number;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  instagramClientId?: string;
  instagramAppSecret?: string;
  instagramRedirectUri?: string;
  resendApiKey?: string;
  anthropicApiKey?: string;
  googleAiKey?: string;
  cronSecret?: string;
  internalSecret?: string;
  corsOrigin: string;
  demoEnabled: boolean;
};

export function readEnv(env = process.env): EnvConfig {
  return {
    port: Number(env.PORT ?? 4000),
    supabaseUrl: env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    razorpayKeyId: env.RAZORPAY_KEY_ID,
    razorpayKeySecret: env.RAZORPAY_KEY_SECRET,
    razorpayWebhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
    instagramClientId: env.INSTAGRAM_CLIENT_ID ?? env.INSTAGRAM_APP_ID,
    instagramAppSecret: env.INSTAGRAM_APP_SECRET,
    instagramRedirectUri: env.INSTAGRAM_REDIRECT_URI ?? env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI,
    resendApiKey: env.RESEND_API_KEY,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    googleAiKey: env.GOOGLE_AI_KEY ?? env.GOOGLE_AI_API_KEY,
    cronSecret: env.CRON_SECRET,
    internalSecret: env.INTERNAL_SECRET,
    corsOrigin: env.CORS_ORIGIN ?? "*",
    demoEnabled: env.NEXT_PUBLIC_DEMO_ENABLED === "true",
  };
}

export function requireConfig(value: string | undefined, name: string) {
  if (!value) {
    throw configurationError(`${name} is required for this operation`);
  }
  return value;
}
