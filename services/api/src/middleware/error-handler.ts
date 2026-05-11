import type { ErrorHandler, NotFoundHandler } from 'hono';
import { ZodError } from 'zod';
import { AppError, conflict } from '../core/errors.js';
import { logger } from '../core/logger.js';
import { fail } from '../core/response.js';
import type { AppEnv } from '../types.js';

export const onError: ErrorHandler<AppEnv> = (error, c) => {
  const log = c.get('log') ?? logger;
  if (
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: string }).code === 'P0001'
  ) {
    const message = (error as { message?: string }).message ?? 'RPC transition failed';
    if (message.includes('illegal_transition')) {
      const mapped = conflict('ILLEGAL_TRANSITION', message);
      return fail(c, mapped.status, mapped.code, mapped.message);
    }
  }
  if (error instanceof AppError) {
    log.error({ err: error, code: error.code }, 'App error');
    return fail(c, error.status, error.code, error.message, error.details);
  }
  if (error instanceof ZodError) {
    log.error({ err: error }, 'Validation error');
    return fail(c, 400, 'VALIDATION_ERROR', 'Invalid request', error.issues);
  }
  if (typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: string }).message ?? 'Internal server error';
    const code = (error as { code?: string }).code ?? 'DATASTORE_ERROR';
    const details =
      'details' in error || 'hint' in error
        ? {
            details: (error as { details?: unknown }).details,
            hint: (error as { hint?: unknown }).hint,
          }
        : undefined;
    log.error({ err: error, code }, 'Unhandled service error');
    return fail(c, 500, code, message, details);
  }
  log.error({ err: error }, 'Unhandled internal server error');
  return fail(c, 500, 'INTERNAL_SERVER_ERROR', 'Internal server error');
};

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) => {
  return fail(c, 404, 'NOT_FOUND', 'Route not found');
};
