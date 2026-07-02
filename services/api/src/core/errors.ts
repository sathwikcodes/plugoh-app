import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class AppError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: ContentfulStatusCode, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new AppError(400, code, message, details);
export const unauthorized = (message = 'Authentication required') =>
  new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Forbidden') => new AppError(403, 'FORBIDDEN', message);
export const notFound = (resource = 'Resource') =>
  new AppError(404, 'NOT_FOUND', `${resource} not found`);
export const conflict = (code: string, message: string) => new AppError(409, code, message);
export const tooManyRequests = (message: string) => new AppError(429, 'RATE_LIMITED', message);
export const serviceUnavailable = (code: string, message: string, details?: unknown) =>
  new AppError(503, code, message, details);
export const configurationError = (message: string) =>
  new AppError(500, 'CONFIGURATION_ERROR', message);
