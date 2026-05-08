import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";
import { register } from "prom-client";
import { ok } from "../../core/response.js";
import { requireSecret } from "../../middleware/auth.js";
import { RazorpayProvider } from "../../clients/providers.js";
import type { AppEnv } from "../../types.js";
import type { EnvConfig } from "../../config/env.js";
import type { RouteDeps } from "../deps.js";

let lastRazorpayReadyAt = 0;

export function systemRoutes(deps: RouteDeps) {
  const app = new Hono<AppEnv>();

  app.get("/", (c) => ok(c, { name: "plugoh-marketplace-api", version: "v1" }));
  app.get("/healthz/live", (c) => ok(c, { service: "api", status: "live" }));
  app.get("/healthz/ready", async (c) => {
    const [supabaseReady, razorpayReady] = await Promise.all([
      readinessSupabase(deps.config),
      readinessRazorpay(deps.config),
    ]);
    if (!supabaseReady || !razorpayReady) {
      return c.json(
        { success: false, code: "SERVICE_UNAVAILABLE", message: "Dependency readiness check failed" },
        503,
      );
    }
    return ok(c, { service: "api", status: "ready" });
  });
  app.get("/metrics", requireSecret("x-internal-secret", deps.config.internalSecret, "internal secret"), async (c) => {
    c.header("Content-Type", register.contentType);
    return c.text(await register.metrics());
  });
  app.post("/api/demo/login", async (c) => {
    if (!deps.config.demoEnabled) {
      return c.json({ success: false, error: { code: "FORBIDDEN", message: "Demo login is disabled" } }, 403);
    }
    return ok(c, { todo: "Demo login requires Supabase demo user configuration" });
  });

  return app;
}

async function readinessSupabase(config: EnvConfig) {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) return true;
  const client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  return withTimeout(async () => {
    const { error } = await client.from("profiles").select("id").limit(1);
    return !error;
  }, 1_000);
}

async function readinessRazorpay(config: EnvConfig) {
  if (!config.readinessRazorpayPaymentId || !config.razorpayKeyId || !config.razorpayKeySecret) return true;
  if (Date.now() - lastRazorpayReadyAt < 30_000) return true;
  try {
    const provider = new RazorpayProvider(config);
    await withTimeout(async () => {
      await provider.fetchPayment(config.readinessRazorpayPaymentId!);
      return true;
    }, 1_000);
    lastRazorpayReadyAt = Date.now();
    return true;
  } catch {
    return false;
  }
}

async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number) {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`timeout:${timeoutMs}`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
