import { validator } from "hono/validator";
import type { ZodSchema } from "zod";
import { badRequest } from "../core/errors.js";

export function zJson<T>(schema: ZodSchema<T>) {
  return validator("json", (value) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw badRequest("VALIDATION_ERROR", "Invalid JSON body", parsed.error.issues);
    return parsed.data;
  });
}

export function zQuery<T>(schema: ZodSchema<T>) {
  return validator("query", (value) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw badRequest("VALIDATION_ERROR", "Invalid query string", parsed.error.issues);
    return parsed.data;
  });
}

export function zParam<T>(schema: ZodSchema<T>) {
  return validator("param", (value) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw badRequest("VALIDATION_ERROR", "Invalid path parameters", parsed.error.issues);
    return parsed.data;
  });
}
