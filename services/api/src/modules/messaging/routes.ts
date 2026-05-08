import { Hono } from "hono";
import { idParamSchema, messageCreateSchema, requestCallSchema } from "@plugoh/contracts";
import { created, ok } from "../../core/response.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { zJson, zParam } from "../../middleware/validate.js";
import type { AppEnv } from "../../types.js";
import type { RouteDeps } from "../deps.js";

export function messagingRoutes(deps: RouteDeps) {
  const app = new Hono<AppEnv>();
  const auth = requireAuth(deps.store, deps.authVerifier);

  app.get("/inbox/influencer", auth, deps.authDefaultRateLimit, requireRole("influencer"), async (c) =>
    ok(c, await deps.scopedReadServices(c).messaging.inbox(deps.requireUser(c), "influencer")),
  );
  app.get("/inbox/business", auth, deps.authDefaultRateLimit, requireRole("business"), async (c) =>
    ok(c, await deps.scopedReadServices(c).messaging.inbox(deps.requireUser(c), "business")),
  );
  app.get("/campaigns/:id/messages", auth, deps.authDefaultRateLimit, zParam(idParamSchema), async (c) =>
    ok(c, await deps.scopedReadServices(c).messaging.messages(deps.requireUser(c), c.req.valid("param").id)),
  );
  app.post("/campaigns/:id/messages", auth, deps.authDefaultRateLimit, zParam(idParamSchema), zJson(messageCreateSchema), async (c) => {
    return created(c, await deps.services.messaging.send(deps.requireUser(c), c.req.valid("param").id, c.req.valid("json")));
  });
  app.patch("/campaigns/:id/messages/read", auth, deps.authDefaultRateLimit, zParam(idParamSchema), async (c) =>
    ok(c, await deps.services.messaging.markRead(deps.requireUser(c), c.req.valid("param").id)),
  );
  app.post("/inbox/request-call", auth, deps.authDefaultRateLimit, zJson(requestCallSchema), async (c) =>
    ok(c, await deps.services.messaging.requestCall(deps.requireUser(c), c.req.valid("json").campaignId)),
  );

  return app;
}
