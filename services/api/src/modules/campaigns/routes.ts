import { Hono } from 'hono';
import {
  campaignListQuerySchema,
  createCampaignSchema,
  deliverySubmitSchema,
  disputeSchema,
  idParamSchema,
} from '@plugoh/contracts';
import { created, ok } from '../../core/response.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { zJson, zParam, zQuery } from '../../middleware/validate.js';
import type { AppEnv } from '../../types.js';
import type { RouteDeps } from '../deps.js';

export function campaignRoutes(deps: RouteDeps) {
  const app = new Hono<AppEnv>();
  const auth = requireAuth(deps.store, deps.authVerifier);

  app.get(
    '/campaigns',
    auth,
    deps.authDefaultRateLimit,
    zQuery(campaignListQuerySchema),
    async (c) => {
      const query = c.req.valid('query');
      return ok(
        c,
        await deps.scopedReadServices(c).campaigns.list(deps.requireUser(c), query.role, query),
      );
    },
  );
  app.post(
    '/campaigns',
    auth,
    deps.authDefaultRateLimit,
    requireRole('business'),
    zJson(createCampaignSchema),
    async (c) => {
      return created(
        c,
        await deps.services.campaigns.create(deps.requireUser(c), c.req.valid('json')),
      );
    },
  );
  app.get('/campaigns/:id', auth, deps.authDefaultRateLimit, zParam(idParamSchema), async (c) => {
    return ok(
      c,
      await deps.scopedReadServices(c).campaigns.get(deps.requireUser(c), c.req.valid('param').id),
    );
  });
  app.post(
    '/campaigns/:id/accept',
    auth,
    deps.authDefaultRateLimit,
    requireRole('influencer'),
    zParam(idParamSchema),
    async (c) => {
      return ok(
        c,
        await deps.services.campaigns.accept(deps.requireUser(c), c.req.valid('param').id),
      );
    },
  );
  app.post(
    '/campaigns/:id/decline',
    auth,
    deps.authDefaultRateLimit,
    requireRole('influencer'),
    zParam(idParamSchema),
    async (c) => {
      return ok(
        c,
        await deps.services.campaigns.decline(deps.requireUser(c), c.req.valid('param').id),
      );
    },
  );
  app.post(
    '/campaigns/:id/approve',
    auth,
    deps.authDefaultRateLimit,
    requireRole('business'),
    zParam(idParamSchema),
    async (c) => {
      return ok(
        c,
        await deps.services.campaigns.approve(deps.requireUser(c), c.req.valid('param').id),
      );
    },
  );
  app.post(
    '/campaigns/:id/dispute',
    auth,
    deps.authDefaultRateLimit,
    requireRole('business'),
    zParam(idParamSchema),
    zJson(disputeSchema),
    async (c) => {
      return ok(
        c,
        await deps.services.campaigns.dispute(
          deps.requireUser(c),
          c.req.valid('param').id,
          c.req.valid('json').reason,
        ),
      );
    },
  );
  app.post(
    '/campaigns/:id/deliver',
    auth,
    deps.authDefaultRateLimit,
    requireRole('influencer'),
    zParam(idParamSchema),
    zJson(deliverySubmitSchema),
    async (c) => {
      return ok(
        c,
        await deps.services.delivery.submit(
          deps.requireUser(c),
          c.req.valid('param').id,
          c.req.valid('json'),
        ),
      );
    },
  );
  app.get(
    '/campaigns/:id/delivery/url',
    auth,
    deps.authDefaultRateLimit,
    zParam(idParamSchema),
    async (c) => {
      return ok(
        c,
        await deps.services.delivery.signedUrl(deps.requireUser(c), c.req.valid('param').id),
      );
    },
  );

  return app;
}
