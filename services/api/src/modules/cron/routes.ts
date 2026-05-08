import { Hono } from "hono";
import { ok } from "../../core/response.js";
import { requireSecret } from "../../middleware/auth.js";
import type { AppEnv } from "../../types.js";
import type { RouteDeps } from "../deps.js";

export function cronRoutes(deps: RouteDeps) {
  const app = new Hono<AppEnv>();

  if (deps.config.cronHttpEnabled) {
    app.get("/cron/auto-release", requireSecret("x-cron-secret", deps.config.cronSecret, "cron secret"), async (c) =>
      ok(c, await deps.services.cron.autoRelease()),
    );
  }

  return app;
}
