import { Hono } from "hono";
import { badRequest } from "../../core/errors.js";
import { ok } from "../../core/response.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import type { AppEnv } from "../../types.js";
import type { RouteDeps } from "../deps.js";

export function deliveryRoutes(deps: RouteDeps) {
  const app = new Hono<AppEnv>();
  const auth = requireAuth(deps.store, deps.authVerifier);

  app.post("/delivery/upload", auth, deps.authDefaultRateLimit, requireRole("influencer"), async (c) => {
    const form = await c.req.formData();
    const campaignId = form.get("campaignId");
    const file = form.get("file");
    if (typeof campaignId !== "string" || !(file instanceof File)) {
      throw badRequest("VALIDATION_ERROR", "file and campaignId are required");
    }
    return ok(c, await deps.services.delivery.upload(deps.requireUser(c), campaignId, file));
  });

  return app;
}
