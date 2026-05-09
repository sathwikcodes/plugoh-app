import { Hono } from "hono";
import {
  businessProfilePatchSchema,
  influencerActivePatchSchema,
  influencerOnboardingSchema,
  influencerPricingPatchSchema,
  influencerProfilePatchSchema,
  payoutUpsertSchema,
} from "@plugoh/contracts";
import { ok } from "../../core/response.js";
import { createSupabaseAuthVerifier, requireAuth, requireRole } from "../../middleware/auth.js";
import { zJson } from "../../middleware/validate.js";
import type { AppEnv } from "../../types.js";
import type { RouteDeps } from "../deps.js";

export function profileRoutes(deps: RouteDeps) {
  const app = new Hono<AppEnv>();
  const auth = requireAuth(deps.store, deps.authVerifier ?? createSupabaseAuthVerifier(deps.config));

  app.get("/me/bootstrap", auth, deps.authDefaultRateLimit, async (c) => {
    return ok(c, await deps.services.profiles.bootstrap(deps.requireUser(c), c.get("role") ?? null));
  });
  app.post("/influencer/onboarding", auth, deps.authDefaultRateLimit, zJson(influencerOnboardingSchema), async (c) => {
    return ok(c, await deps.services.profiles.upsertInfluencerOnboarding(deps.requireUser(c), c.req.valid("json")));
  });

  app.get("/influencer/profile", auth, deps.authDefaultRateLimit, requireRole("influencer"), async (c) => {
    return ok(c, await deps.scopedReadServices(c).profiles.getInfluencer(deps.requireUser(c)));
  });
  app.patch("/influencer/profile", auth, deps.authDefaultRateLimit, requireRole("influencer"), zJson(influencerProfilePatchSchema), async (c) => {
    return ok(c, await deps.services.profiles.updateInfluencer(deps.requireUser(c), c.req.valid("json")));
  });
  app.patch("/influencer/profile/pricing", auth, deps.authDefaultRateLimit, requireRole("influencer"), zJson(influencerPricingPatchSchema), async (c) => {
    return ok(c, await deps.services.profiles.updateInfluencer(deps.requireUser(c), c.req.valid("json")));
  });
  app.patch("/influencer/profile/active", auth, deps.authDefaultRateLimit, requireRole("influencer"), zJson(influencerActivePatchSchema), async (c) => {
    return ok(c, await deps.services.profiles.updateInfluencer(deps.requireUser(c), c.req.valid("json")));
  });
  app.get("/influencer/payout", auth, deps.authDefaultRateLimit, requireRole("influencer"), async (c) => {
    return ok(c, await deps.services.profiles.getPayout(deps.requireUser(c)));
  });
  app.put("/influencer/payout", auth, deps.authDefaultRateLimit, requireRole("influencer"), zJson(payoutUpsertSchema), async (c) => {
    return ok(c, await deps.services.profiles.upsertPayout(deps.requireUser(c), c.req.valid("json")));
  });
  app.get("/influencer/earnings", auth, deps.authDefaultRateLimit, requireRole("influencer"), async (c) => {
    return ok(c, await deps.scopedReadServices(c).earnings.summary(deps.requireUser(c)));
  });

  app.get("/business/profile", auth, deps.authDefaultRateLimit, requireRole("business"), async (c) => {
    return ok(c, await deps.scopedReadServices(c).profiles.getBusiness(deps.requireUser(c)));
  });
  app.patch("/business/profile", auth, deps.authDefaultRateLimit, requireRole("business"), zJson(businessProfilePatchSchema), async (c) => {
    return ok(c, await deps.services.profiles.updateBusiness(deps.requireUser(c), c.req.valid("json")));
  });

  return app;
}
