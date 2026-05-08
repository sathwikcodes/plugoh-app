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
  redisConnectionString?: string;
  applicationInsightsConnectionString?: string;
  aiProvider?: "anthropic" | "heuristic";
  readinessRazorpayPaymentId?: string;
  cronHttpEnabled: boolean;
  corsOrigin: string;
  demoEnabled: boolean;
};

export function readEnv(env = process.env): EnvConfig {
  const optional: Partial<EnvConfig> = {};
  const setIfDefined = (key: string, value: string | undefined) => {
    if (value) {
      (optional as Record<string, string>)[key] = value;
    }
  };

  setIfDefined("supabaseUrl", env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL);
  setIfDefined("supabaseAnonKey", env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY);
  setIfDefined("supabaseServiceRoleKey", env.SUPABASE_SERVICE_ROLE_KEY);
  setIfDefined("razorpayKeyId", env.RAZORPAY_KEY_ID);
  setIfDefined("razorpayKeySecret", env.RAZORPAY_KEY_SECRET);
  setIfDefined("razorpayWebhookSecret", env.RAZORPAY_WEBHOOK_SECRET);
  setIfDefined("instagramClientId", env.INSTAGRAM_CLIENT_ID ?? env.INSTAGRAM_APP_ID);
  setIfDefined("instagramAppSecret", env.INSTAGRAM_APP_SECRET);
  setIfDefined("instagramRedirectUri", env.INSTAGRAM_REDIRECT_URI ?? env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI);
  setIfDefined("resendApiKey", env.RESEND_API_KEY);
  setIfDefined("anthropicApiKey", env.ANTHROPIC_API_KEY);
  setIfDefined("googleAiKey", env.GOOGLE_AI_KEY ?? env.GOOGLE_AI_API_KEY);
  setIfDefined("cronSecret", env.CRON_SECRET);
  setIfDefined("internalSecret", env.INTERNAL_SECRET);
  setIfDefined("redisConnectionString", env.REDIS_CONNECTION_STRING);
  setIfDefined("applicationInsightsConnectionString", env.APPLICATIONINSIGHTS_CONNECTION_STRING);
  const aiProvider = env.AI_PROVIDER;
  if (aiProvider === "anthropic" || aiProvider === "heuristic") {
    optional.aiProvider = aiProvider;
  }
  setIfDefined("readinessRazorpayPaymentId", env.READINESS_RAZORPAY_PAYMENT_ID);

  return {
    port: Number(env.PORT ?? 4000),
    ...optional,
    cronHttpEnabled: env.CRON_HTTP_ENABLED !== "false",
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
