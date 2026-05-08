import type { ErrorHandler, NotFoundHandler } from "hono";
import { ZodError } from "zod";
import { AppError } from "../core/errors.js";
import { fail } from "../core/response.js";
import type { AppEnv } from "../types.js";

export const onError: ErrorHandler<AppEnv> = (error, c) => {
  if (error instanceof AppError) {
    return fail(c, error.status, error.code, error.message, error.details);
  }
  if (error instanceof ZodError) {
    return fail(c, 400, "VALIDATION_ERROR", "Invalid request", error.issues);
  }
  console.error(error);
  return fail(c, 500, "INTERNAL_SERVER_ERROR", "Internal server error");
};

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) => {
  return fail(c, 404, "NOT_FOUND", "Route not found");
};
