import { Hono } from "hono";
import {
  campaignIdSchema,
  createBookingOrderSchema,
  createEscrowOrderSchema,
  verifyBookingPaymentSchema,
  verifyEscrowSchema,
} from "@plugoh/contracts";
import { ok } from "../../core/response.js";
import { requireAuth, requireRole, requireSecret } from "../../middleware/auth.js";
import { zJson } from "../../middleware/validate.js";
import type { AppEnv } from "../../types.js";
import type { RouteDeps } from "../deps.js";

export function paymentRoutes(deps: RouteDeps) {
  const app = new Hono<AppEnv>();
  const auth = requireAuth(deps.store, deps.authVerifier);

  app.post("/payment/create-escrow-order", auth, deps.paymentRateLimit, requireRole("business"), zJson(createEscrowOrderSchema), async (c) => {
    return ok(c, await deps.services.payments.createEscrowOrder(deps.requireUser(c), c.req.valid("json").campaign_id));
  });
  app.post("/payment/create-order", auth, deps.paymentRateLimit, requireRole("business"), zJson(createEscrowOrderSchema), async (c) => {
    return ok(c, await deps.services.payments.createEscrowOrder(deps.requireUser(c), c.req.valid("json").campaign_id));
  });
  app.post("/payment/verify-escrow", auth, deps.paymentRateLimit, requireRole("business"), zJson(verifyEscrowSchema), async (c) => {
    const cached = await deps.claimIdempotency(deps.store, c.req.header("idempotency-key"));
    if (cached) return ok(c, cached);
    const result = await deps.services.payments.verifyEscrow(deps.requireUser(c), c.req.valid("json"));
    await deps.store.rpc("claim_idempotency", { p_key: deps.requireIdempotencyKey(c.req.header("idempotency-key")), p_response: result });
    return ok(c, result);
  });
  app.post("/payment/verify", auth, deps.paymentRateLimit, requireRole("business"), zJson(verifyEscrowSchema), async (c) => {
    const cached = await deps.claimIdempotency(deps.store, c.req.header("idempotency-key"));
    if (cached) return ok(c, cached);
    const result = await deps.services.payments.verifyEscrow(deps.requireUser(c), c.req.valid("json"));
    await deps.store.rpc("claim_idempotency", { p_key: deps.requireIdempotencyKey(c.req.header("idempotency-key")), p_response: result });
    return ok(c, result);
  });
  app.post("/payment/create-booking-order", auth, deps.paymentRateLimit, requireRole("business"), zJson(createBookingOrderSchema), async (c) => {
    return ok(c, await deps.services.payments.createBookingOrder(c.req.valid("json")));
  });
  app.post("/payment/verify-booking-payment", auth, deps.paymentRateLimit, requireRole("business"), zJson(verifyBookingPaymentSchema), async (c) => {
    const cached = await deps.claimIdempotency(deps.store, c.req.header("idempotency-key"));
    if (cached) return ok(c, cached);
    const result = await deps.services.payments.verifyBookingPayment(deps.requireUser(c), c.req.valid("json"));
    await deps.store.rpc("claim_idempotency", { p_key: deps.requireIdempotencyKey(c.req.header("idempotency-key")), p_response: result });
    return ok(c, result);
  });
  app.post("/payment/capture-booking-payment", requireSecret("x-internal-secret", deps.config.internalSecret, "internal secret"), zJson(campaignIdSchema), async (c) => {
    return ok(c, await deps.services.payments.captureBookingPayment(c.req.valid("json").campaign_id));
  });
  app.post("/payment/release-escrow", deps.paymentRateLimit, zJson(campaignIdSchema), async (c) => {
    const cached = await deps.claimIdempotency(deps.store, c.req.header("idempotency-key"));
    if (cached) return ok(c, cached);
    const user = await deps.authOrCron(c, deps.store, deps.authVerifier, deps.config.cronSecret);
    const result = await deps.services.payments.releaseEscrow(user, c.req.valid("json").campaign_id);
    await deps.store.rpc("claim_idempotency", { p_key: deps.requireIdempotencyKey(c.req.header("idempotency-key")), p_response: result });
    return ok(c, result);
  });
  app.post("/payment/webhook", async (c) => {
    const body = await c.req.text();
    return ok(c, await deps.services.payments.webhook(body, c.req.header("x-razorpay-signature")));
  });

  return app;
}
