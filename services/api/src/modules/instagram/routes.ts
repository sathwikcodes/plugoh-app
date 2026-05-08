import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { instagramCallbackQuerySchema, instagramConnectQuerySchema } from "@plugoh/contracts";
import { forbidden } from "../../core/errors.js";
import { ok } from "../../core/response.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { zQuery } from "../../middleware/validate.js";
import type { AppEnv } from "../../types.js";
import type { RouteDeps } from "../deps.js";

export function instagramRoutes(deps: RouteDeps) {
  const app = new Hono<AppEnv>();
  const auth = requireAuth(deps.store, deps.authVerifier);

  app.get("/instagram/connect", auth, deps.paymentRateLimit, zQuery(instagramConnectQuerySchema), async (c) => {
    const user = deps.requireUser(c);
    const role = deps.requireRoleValue(c);
    const input = c.req.valid("query");
    if (input.userId !== user.id) throw forbidden("Instagram connect user must match authenticated user");
    if (input.role !== role) throw forbidden("Instagram connect role must match authenticated user role");
    const result = deps.services.instagram.connect(input);
    setCookie(c, "ig_oauth_state", result.state, { httpOnly: true, sameSite: "Lax", path: "/" });
    return ok(c, { url: result.url });
  });
  app.get("/auth/callback/instagram", zQuery(instagramCallbackQuerySchema), async (c) => {
    const result = await deps.services.instagram.callback(c.req.valid("query"), getCookie(c, "ig_oauth_state"));
    return c.redirect(result.redirectTo);
  });
  app.post("/instagram/sync", auth, deps.authDefaultRateLimit, requireRole("influencer"), async (c) =>
    ok(c, await deps.scopedReadServices(c).instagram.sync(deps.requireUser(c))),
  );

  return app;
}
