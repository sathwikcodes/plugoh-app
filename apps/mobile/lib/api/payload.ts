/**
 * Removes keys whose value is `undefined`, `null`, or a blank/whitespace string.
 *
 * Optional contract fields are declared as `z.string().trim().min(1).optional()`,
 * so an empty string (`''`) is *present* and fails `.min(1)` validation — it must
 * be omitted from the request body, not sent. Forms that spread their full state
 * (e.g. profile edit, payout) would otherwise send blank optional fields and get
 * a 400 VALIDATION_ERROR ("Invalid JSON body"). Non-string values (numbers, 0,
 * false, arrays) are preserved as-is.
 */
export function compactPayload<T extends Record<string, unknown>>(input: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim().length === 0) continue;
    out[key as keyof T] = value as T[keyof T];
  }
  return out;
}
