import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.js";

export const requestIdMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const id = c.req.header("x-request-id") ?? crypto.randomUUID();
  c.set("requestId", id);
  c.header("x-request-id", id);
  await next();
});
