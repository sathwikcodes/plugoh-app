import { Hono } from "hono";
import { idParamSchema, influencerListQuerySchema } from "@plugoh/contracts";
import { ok } from "../../core/response.js";
import { zParam, zQuery } from "../../middleware/validate.js";
import type { AppEnv } from "../../types.js";
import type { RouteDeps } from "../deps.js";

export function discoveryRoutes(deps: RouteDeps) {
  const app = new Hono<AppEnv>();

  app.get("/influencers", deps.publicDiscoveryRateLimit, zQuery(influencerListQuerySchema), async (c) => {
    return ok(c, await deps.services.discovery.list(c.req.valid("query")));
  });
  app.get("/influencers/:id", deps.publicDiscoveryRateLimit, zParam(idParamSchema), async (c) => {
    return ok(c, await deps.services.discovery.get(c.req.valid("param").id));
  });

  return app;
}
