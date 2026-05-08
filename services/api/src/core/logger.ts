import pino from "pino";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.js";

const loggerOptions = {
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "*.razorpay_signature"],
    censor: "[REDACTED]",
  },
  ...(process.env.NODE_ENV !== "production"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
      }
    : {}),
};

export const logger = pino(loggerOptions);

export const loggerMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const child = logger.child({
    requestId: c.get("requestId"),
    userId: c.get("user")?.id,
    route: c.req.path,
  });
  c.set("log", child);
  await next();
});
