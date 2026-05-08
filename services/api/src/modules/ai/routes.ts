import { Hono } from "hono";
import { aiGenerateSchema } from "@plugoh/contracts";
import { ok } from "../../core/response.js";
import { requireSecret } from "../../middleware/auth.js";
import { zJson } from "../../middleware/validate.js";
import type { AppEnv } from "../../types.js";
import type { RouteDeps } from "../deps.js";

export function aiRoutes(deps: RouteDeps) {
  const app = new Hono<AppEnv>();

  app.post("/ai/generate-profile", requireSecret("x-internal-secret", deps.config.internalSecret, "internal secret"), zJson(aiGenerateSchema), async (c) => {
    return ok(c, await deps.services.ai.influencer(c.req.valid("json").userId));
  });
  app.post("/ai/generate-business-profile", requireSecret("x-internal-secret", deps.config.internalSecret, "internal secret"), zJson(aiGenerateSchema), async (c) => {
    return ok(c, await deps.services.ai.business(c.req.valid("json").userId));
  });

  return app;
}
