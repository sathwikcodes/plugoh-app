import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export function requestId(c: Context) {
  return c.get("requestId") ?? "unknown";
}

export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json({ success: true, data, meta: { requestId: requestId(c) } }, status);
}

export function created<T>(c: Context, data: T) {
  return ok(c, data, 201);
}

export function fail(c: Context, status: ContentfulStatusCode, code: string, message: string, details?: unknown) {
  return c.json({ success: false, error: { code, message, details }, meta: { requestId: requestId(c) } }, status);
}
