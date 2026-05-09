import { Hono } from "hono";
import { pushRegisterSchema } from "@plugoh/contracts";
import { ok } from "../../core/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { zJson } from "../../middleware/validate.js";
import type { AppEnv } from "../../types.js";
import type { RouteDeps } from "../deps.js";

export function pushRoutes(deps: RouteDeps) {
  const app = new Hono<AppEnv>();
  const auth = requireAuth(deps.store, deps.authVerifier);

  app.post("/push/register", auth, deps.authDefaultRateLimit, zJson(pushRegisterSchema), async (c) => {
    return ok(c, await deps.services.notifications.registerPush(deps.requireUser(c), c.req.valid("json")));
  });
  app.post("/push/unregister", auth, deps.authDefaultRateLimit, async (c) => {
    return ok(c, await deps.services.notifications.unregisterPush(deps.requireUser(c)));
  });

  return app;
}
