import type { Context, Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { etag } from 'hono/etag';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { rateLimiter } from 'hono-rate-limiter';
import type { EnvConfig } from '../config/env.js';
import { loggerMiddleware } from '../core/logger.js';
import { fail } from '../core/response.js';
import { onError, notFoundHandler } from '../middleware/error-handler.js';
import type { DataStore } from '../repositories/data-store.js';
import { createServices, type ProviderBundle, type Services } from '../services/marketplace.js';
import type { AppEnv } from '../types.js';
import { aiRoutes } from './ai/routes.js';
import { campaignRoutes } from './campaigns/routes.js';
import { cronRoutes } from './cron/routes.js';
import { deliveryRoutes } from './delivery/routes.js';
import type { RouteDeps } from './deps.js';
import { discoveryRoutes } from './discovery/routes.js';
import { instagramRoutes } from './instagram/routes.js';
import { messagingRoutes } from './messaging/routes.js';
import { notificationRoutes } from './notifications/routes.js';
import { paymentRoutes } from './payments/routes.js';
import { profileRoutes } from './profiles/routes.js';
import { pushRoutes } from './push/routes.js';
import { systemRoutes } from './system/routes.js';

export function applyGlobalMiddleware(app: Hono<AppEnv>, config: EnvConfig) {
  app.use('*', requestId());
  app.use('*', trimTrailingSlash());
  app.use('*', secureHeaders());
  app.use('*', etag());
  app.use('*', compress());
  app.use('*', loggerMiddleware);
  if (process.env.NODE_ENV !== 'production') app.use('*', timing());
  app.use('*', async (c, next) => {
    const maxSize = c.req.path === '/delivery/upload' ? 50 * 1024 * 1024 : 1 * 1024 * 1024;
    return bodyLimit({ maxSize })(c, next);
  });
  app.use(
    '*',
    cors({
      origin: config.corsOrigin,
      allowHeaders: [
        'authorization',
        'content-type',
        'idempotency-key',
        'x-internal-secret',
        'x-cron-secret',
        'x-razorpay-signature',
        'x-request-id',
      ],
    }),
  );
  app.onError(onError);
  app.notFound(notFoundHandler);
}

export function createRateLimiters(
  app: Hono<AppEnv>,
  config: EnvConfig,
  createRateLimitStore: (config: EnvConfig) => any,
) {
  const sharedRateLimitStore = createRateLimitStore(config);
  const rateLimitHandler = (c: Context<AppEnv>) =>
    fail(c, 429, 'RATE_LIMITED', 'Too many requests, please try again later.');

  return {
    authDefaultRateLimit: rateLimiter<AppEnv>({
      windowMs: 60_000,
      limit: 120,
      keyGenerator: (c) => c.get('user')?.id ?? c.req.header('x-forwarded-for') ?? 'unknown',
      store: sharedRateLimitStore,
      handler: rateLimitHandler,
    }),
    paymentRateLimit: rateLimiter<AppEnv>({
      windowMs: 60_000,
      limit: 30,
      keyGenerator: (c) => c.get('user')?.id ?? c.req.header('x-forwarded-for') ?? 'unknown',
      store: sharedRateLimitStore,
      handler: rateLimitHandler,
    }),
    publicDiscoveryRateLimit: rateLimiter<AppEnv>({
      windowMs: 60_000,
      limit: 60,
      keyGenerator: (c) => c.req.header('x-forwarded-for') ?? 'unknown',
      store: sharedRateLimitStore,
      handler: rateLimitHandler,
    }),
  };
}

export function mountDomainRoutes(app: Hono<AppEnv>, deps: RouteDeps) {
  app.route('/', systemRoutes(deps));
  app.route('/', discoveryRoutes(deps));
  app.route('/', profileRoutes(deps));
  app.route('/', campaignRoutes(deps));
  app.route('/', paymentRoutes(deps));
  app.route('/', deliveryRoutes(deps));
  app.route('/', messagingRoutes(deps));
  app.route('/', notificationRoutes(deps));
  app.route('/', pushRoutes(deps));
  app.route('/', instagramRoutes(deps));
  app.route('/', aiRoutes(deps));
  app.route('/', cronRoutes(deps));
}

export function buildDeps(
  options: {
    config: EnvConfig;
    store: DataStore;
    providers: ProviderBundle;
  },
  base: {
    authVerifier: RouteDeps['authVerifier'];
    requireUser: RouteDeps['requireUser'];
    requireRoleValue: RouteDeps['requireRoleValue'];
    claimIdempotency: RouteDeps['claimIdempotency'];
    storeIdempotency: RouteDeps['storeIdempotency'];
    requireIdempotencyKey: RouteDeps['requireIdempotencyKey'];
    authOrCron: RouteDeps['authOrCron'];
    scopedReadServices: RouteDeps['scopedReadServices'];
    authDefaultRateLimit: any;
    paymentRateLimit: any;
    publicDiscoveryRateLimit: any;
  },
): RouteDeps {
  const services: Services = createServices(options.store, options.providers, options.config);
  return {
    ...base,
    store: options.store,
    providers: options.providers,
    config: options.config,
    services,
  };
}
