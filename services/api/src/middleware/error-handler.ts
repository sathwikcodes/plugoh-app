import type { ErrorHandler, NotFoundHandler } from "hono";
import { ZodError } from "zod";
import { AppError, conflict } from "../core/errors.js";
import { logger } from "../core/logger.js";
import { fail } from "../core/response.js";
import type { AppEnv } from "../types.js";

export const onError: ErrorHandler<AppEnv> = (error, c) => {
  const log = c.get("log") ?? logger;
  if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P0001") {
    const message = String((error as { message?: string }).message ?? "RPC transition failed");
    if (message.includes("illegal_transition")) {
      const mapped = conflict("ILLEGAL_TRANSITION", message);
      return fail(c, mapped.status, mapped.code, mapped.message);
    }
  }
  if (error instanceof AppError) {
    log.error({ err: error, code: error.code }, "App error");
    return fail(c, error.status, error.code, error.message, error.details);
  }
  if (error instanceof ZodError) {
    log.error({ err: error }, "Validation error");
    return fail(c, 400, "VALIDATION_ERROR", "Invalid request", error.issues);
  }
  log.error({ err: error }, "Unhandled internal server error");
  return fail(c, 500, "INTERNAL_SERVER_ERROR", "Internal server error");
};

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) => {
  return fail(c, 404, "NOT_FOUND", "Route not found");
};
