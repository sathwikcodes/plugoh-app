import { createMiddleware } from 'hono/factory';
import { logger } from '../core/logger.js';
import type { AppEnv } from '../types.js';

/**
 * Logs one line per request: method, path, status, durationMs, requestId, and
 * (when resolved) userId/role. Successful and non-thrown responses (including
 * 4xx returned via `fail()` and 404s) are logged here; thrown errors are logged
 * by the error handler, which reads `requestStartMs` to report the same duration.
 *
 * Secrets are never logged — only the path (no query string), method, and
 * status. Header/body redaction is configured on the shared Pino instance.
 */
export const requestLog = createMiddleware<AppEnv>(async (c, next) => {
  const start = performance.now();
  c.set('requestStartMs', start);
  await next();
  const durationMs = Math.round((performance.now() - start) * 100) / 100;
  const method = c.req.method;
  const path = c.req.path;
  const status = c.res.status;
  logger.info(
    {
      requestId: c.get('requestId'),
      method,
      path,
      status,
      durationMs,
      userId: c.get('user')?.id,
      role: c.get('role'),
    },
    `${method} ${path} ${status} ${durationMs}ms`,
  );
});
