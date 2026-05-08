import { Hono } from "hono";
import { notificationsReadSchema } from "@plugoh/contracts";
import { ok } from "../../core/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { zJson } from "../../middleware/validate.js";
import type { AppEnv } from "../../types.js";
import type { RouteDeps } from "../deps.js";

export function notificationRoutes(deps: RouteDeps) {
  const app = new Hono<AppEnv>();
  const auth = requireAuth(deps.store, deps.authVerifier);

  app.get("/notifications", auth, deps.authDefaultRateLimit, async (c) =>
    ok(c, await deps.scopedReadServices(c).notifications.list(deps.requireUser(c))),
  );
  app.patch("/notifications/read", auth, deps.authDefaultRateLimit, zJson(notificationsReadSchema), async (c) =>
    ok(c, await deps.services.notifications.markRead(deps.requireUser(c), c.req.valid("json"))),
  );

  return app;
}
