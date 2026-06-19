import { Hono } from 'hono';
import {
  businessOnboardingSchema,
  businessProfilePatchSchema,
  commonProfilePatchSchema,
  geocodeSchema,
  influencerActivePatchSchema,
  influencerOnboardingSchema,
  influencerPricingPatchSchema,
  influencerProfilePatchSchema,
  payoutUpsertSchema,
  placeAutocompleteSchema,
  placeDetailsSchema,
  reverseGeocodeSchema,
  roleUpsertSchema,
} from '@plugoh/contracts';
import { ok } from '../../core/response.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { zJson } from '../../middleware/validate.js';
import type { AppEnv } from '../../types.js';
import type { RouteDeps } from '../deps.js';

export function profileRoutes(deps: RouteDeps) {
  const app = new Hono<AppEnv>();
  const auth = requireAuth(deps.store, deps.authVerifier);

  app.get('/me/bootstrap', auth, deps.authDefaultRateLimit, async (c) => {
    return ok(
      c,
      await deps.services.profiles.bootstrap(deps.requireUser(c), c.get('role') ?? null),
    );
  });
  app.post('/me/role', auth, deps.authDefaultRateLimit, zJson(roleUpsertSchema), async (c) => {
    return ok(
      c,
      await deps.services.profiles.upsertRole(deps.requireUser(c), c.req.valid('json').role),
    );
  });
  app.patch(
    '/me/profile',
    auth,
    deps.authDefaultRateLimit,
    zJson(commonProfilePatchSchema),
    async (c) => {
      return ok(
        c,
        await deps.services.profiles.upsertCommonProfile(deps.requireUser(c), c.req.valid('json')),
      );
    },
  );
  app.post(
    '/locations/geocode',
    auth,
    deps.authDefaultRateLimit,
    zJson(geocodeSchema),
    async (c) => {
      return ok(c, await deps.services.profiles.geocode(c.req.valid('json')));
    },
  );
  app.post(
    '/locations/reverse-geocode',
    auth,
    deps.authDefaultRateLimit,
    zJson(reverseGeocodeSchema),
    async (c) => {
      return ok(c, await deps.services.profiles.reverseGeocode(c.req.valid('json')));
    },
  );
  app.post(
    '/locations/autocomplete',
    auth,
    deps.authDefaultRateLimit,
    zJson(placeAutocompleteSchema),
    async (c) => {
      return ok(c, await deps.services.profiles.autocomplete(c.req.valid('json')));
    },
  );
  app.post(
    '/locations/place-details',
    auth,
    deps.authDefaultRateLimit,
    zJson(placeDetailsSchema),
    async (c) => {
      return ok(c, await deps.services.profiles.placeDetails(c.req.valid('json')));
    },
  );
  app.post(
    '/influencer/onboarding',
    auth,
    deps.authDefaultRateLimit,
    zJson(influencerOnboardingSchema),
    async (c) => {
      return ok(
        c,
        await deps.services.profiles.upsertInfluencerOnboarding(
          deps.requireUser(c),
          c.req.valid('json'),
        ),
      );
    },
  );
  app.post(
    '/business/onboarding',
    auth,
    deps.authDefaultRateLimit,
    zJson(businessOnboardingSchema),
    async (c) => {
      return ok(
        c,
        await deps.services.profiles.upsertBusinessOnboarding(
          deps.requireUser(c),
          c.req.valid('json'),
        ),
      );
    },
  );

  app.get(
    '/influencer/profile',
    auth,
    deps.authDefaultRateLimit,
    requireRole('influencer'),
    async (c) => {
      return ok(c, await deps.scopedReadServices(c).profiles.getInfluencer(deps.requireUser(c)));
    },
  );
  app.patch(
    '/influencer/profile',
    auth,
    deps.authDefaultRateLimit,
    requireRole('influencer'),
    zJson(influencerProfilePatchSchema),
    async (c) => {
      return ok(
        c,
        await deps.services.profiles.updateInfluencer(deps.requireUser(c), c.req.valid('json')),
      );
    },
  );
  app.patch(
    '/influencer/profile/pricing',
    auth,
    deps.authDefaultRateLimit,
    requireRole('influencer'),
    zJson(influencerPricingPatchSchema),
    async (c) => {
      return ok(
        c,
        await deps.services.profiles.updateInfluencer(deps.requireUser(c), c.req.valid('json')),
      );
    },
  );
  app.patch(
    '/influencer/profile/active',
    auth,
    deps.authDefaultRateLimit,
    requireRole('influencer'),
    zJson(influencerActivePatchSchema),
    async (c) => {
      return ok(
        c,
        await deps.services.profiles.updateInfluencer(deps.requireUser(c), c.req.valid('json')),
      );
    },
  );
  app.get(
    '/influencer/payout',
    auth,
    deps.authDefaultRateLimit,
    requireRole('influencer'),
    async (c) => {
      return ok(c, await deps.services.profiles.getPayout(deps.requireUser(c)));
    },
  );
  app.put(
    '/influencer/payout',
    auth,
    deps.authDefaultRateLimit,
    requireRole('influencer'),
    zJson(payoutUpsertSchema),
    async (c) => {
      return ok(
        c,
        await deps.services.profiles.upsertPayout(deps.requireUser(c), c.req.valid('json')),
      );
    },
  );
  app.get(
    '/influencer/earnings',
    auth,
    deps.authDefaultRateLimit,
    requireRole('influencer'),
    async (c) => {
      return ok(c, await deps.scopedReadServices(c).earnings.summary(deps.requireUser(c)));
    },
  );

  app.get(
    '/business/profile',
    auth,
    deps.authDefaultRateLimit,
    requireRole('business'),
    async (c) => {
      return ok(c, await deps.scopedReadServices(c).profiles.getBusiness(deps.requireUser(c)));
    },
  );
  app.patch(
    '/business/profile',
    auth,
    deps.authDefaultRateLimit,
    requireRole('business'),
    zJson(businessProfilePatchSchema),
    async (c) => {
      return ok(
        c,
        await deps.services.profiles.updateBusiness(deps.requireUser(c), c.req.valid('json')),
      );
    },
  );

  return app;
}
