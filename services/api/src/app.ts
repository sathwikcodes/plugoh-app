import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { setCookie, getCookie } from "hono/cookie";
import { secureHeaders } from "hono/secure-headers";
import { trimTrailingSlash } from "hono/trailing-slash";
import {
  aiGenerateSchema,
  businessProfilePatchSchema,
  campaignIdSchema,
  campaignListQuerySchema,
  createBookingOrderSchema,
  createCampaignSchema,
  createEscrowOrderSchema,
  deliverySubmitSchema,
  disputeSchema,
  idParamSchema,
  influencerActivePatchSchema,
  influencerListQuerySchema,
  influencerPricingPatchSchema,
  influencerProfilePatchSchema,
  instagramCallbackQuerySchema,
  instagramConnectQuerySchema,
  messageCreateSchema,
  notificationsReadSchema,
  payoutUpsertSchema,
  requestCallSchema,
  verifyBookingPaymentSchema,
  verifyEscrowSchema,
} from "@plugoh/contracts";
import type { EnvConfig } from "./config/env.js";
import { readEnv } from "./config/env.js";
import {
  ExternalAiProvider,
  MetaInstagramProvider,
  RazorpayProvider,
  ResendEmailProvider,
  SupabaseStorageProvider,
  type AiProvider,
  type EmailProvider,
  type InstagramProvider,
  type PaymentProvider,
  type StorageProvider,
} from "./clients/providers.js";
import { badRequest, forbidden, unauthorized } from "./core/errors.js";
import { created, ok } from "./core/response.js";
import { createSupabaseAuthVerifier, requireAuth, requireRole, requireSecret, type AuthVerifier } from "./middleware/auth.js";
import { onError, notFoundHandler } from "./middleware/error-handler.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { zJson, zParam, zQuery } from "./middleware/validate.js";
import { SupabaseDataStore, type DataStore } from "./repositories/data-store.js";
import { createServices, type ProviderBundle } from "./services/marketplace.js";
import type { AppEnv, AuthUser } from "./types.js";

export type AppOptions = {
  config?: EnvConfig;
  store?: DataStore;
  authVerifier?: AuthVerifier;
  providers?: ProviderBundle;
};

export function createApp(options: AppOptions = {}) {
  const config = options.config ?? readEnv();
  const store = options.store ?? new SupabaseDataStore(config);
  const authVerifier = options.authVerifier ?? createSupabaseAuthVerifier(config);
  const providers = options.providers ?? createDefaultProviders(config);
  const services = createServices(store, providers, config);
  const app = new Hono<AppEnv>();

  app.use("*", requestIdMiddleware);
  app.use("*", trimTrailingSlash());
  app.use("*", secureHeaders());
  app.use("*", cors({ origin: config.corsOrigin ?? "*", allowHeaders: ["authorization", "content-type", "x-internal-secret", "x-cron-secret", "x-razorpay-signature", "x-request-id"] }));
  app.onError(onError);
  app.notFound(notFoundHandler);

  app.get("/", (c) => ok(c, { name: "plugoh-marketplace-api", version: "v1" }));
  app.get("/health", (c) => ok(c, { service: "api", status: "ok" }));

  app.get("/influencers", zQuery(influencerListQuerySchema), async (c) => {
    return ok(c, await services.discovery.list(c.req.valid("query")));
  });
  app.get("/influencers/:id", zParam(idParamSchema), async (c) => {
    return ok(c, await services.discovery.get(c.req.valid("param").id));
  });

  app.get("/influencer/profile", requireAuth(store, authVerifier), requireRole("influencer"), async (c) => {
    return ok(c, await services.profiles.getInfluencer(c.get("user")));
  });
  app.patch("/influencer/profile", requireAuth(store, authVerifier), requireRole("influencer"), zJson(influencerProfilePatchSchema), async (c) => {
    return ok(c, await services.profiles.updateInfluencer(c.get("user"), c.req.valid("json")));
  });
  app.patch("/influencer/profile/pricing", requireAuth(store, authVerifier), requireRole("influencer"), zJson(influencerPricingPatchSchema), async (c) => {
    return ok(c, await services.profiles.updateInfluencer(c.get("user"), c.req.valid("json")));
  });
  app.patch("/influencer/profile/active", requireAuth(store, authVerifier), requireRole("influencer"), zJson(influencerActivePatchSchema), async (c) => {
    return ok(c, await services.profiles.updateInfluencer(c.get("user"), c.req.valid("json")));
  });
  app.get("/influencer/payout", requireAuth(store, authVerifier), requireRole("influencer"), async (c) => {
    return ok(c, await services.profiles.getPayout(c.get("user")));
  });
  app.put("/influencer/payout", requireAuth(store, authVerifier), requireRole("influencer"), zJson(payoutUpsertSchema), async (c) => {
    return ok(c, await services.profiles.upsertPayout(c.get("user"), c.req.valid("json")));
  });
  app.get("/influencer/earnings", requireAuth(store, authVerifier), requireRole("influencer"), async (c) => {
    return ok(c, await services.earnings.summary(c.get("user")));
  });

  app.get("/business/profile", requireAuth(store, authVerifier), requireRole("business"), async (c) => {
    return ok(c, await services.profiles.getBusiness(c.get("user")));
  });
  app.patch("/business/profile", requireAuth(store, authVerifier), requireRole("business"), zJson(businessProfilePatchSchema), async (c) => {
    return ok(c, await services.profiles.updateBusiness(c.get("user"), c.req.valid("json")));
  });

  app.get("/campaigns", requireAuth(store, authVerifier), zQuery(campaignListQuerySchema), async (c) => {
    return ok(c, await services.campaigns.list(c.get("user"), c.req.valid("query").role));
  });
  app.post("/campaigns", requireAuth(store, authVerifier), requireRole("business"), zJson(createCampaignSchema), async (c) => {
    return created(c, await services.campaigns.create(c.get("user"), c.req.valid("json")));
  });
  app.get("/campaigns/:id", requireAuth(store, authVerifier), zParam(idParamSchema), async (c) => {
    return ok(c, await services.campaigns.get(c.get("user"), c.req.valid("param").id));
  });
  app.post("/campaigns/:id/accept", requireAuth(store, authVerifier), requireRole("influencer"), zParam(idParamSchema), async (c) => {
    return ok(c, await services.campaigns.accept(c.get("user"), c.req.valid("param").id));
  });
  app.post("/campaigns/:id/decline", requireAuth(store, authVerifier), requireRole("influencer"), zParam(idParamSchema), async (c) => {
    return ok(c, await services.campaigns.decline(c.get("user"), c.req.valid("param").id));
  });
  app.post("/campaigns/:id/approve", requireAuth(store, authVerifier), requireRole("business"), zParam(idParamSchema), async (c) => {
    return ok(c, await services.campaigns.approve(c.get("user"), c.req.valid("param").id));
  });
  app.post("/campaigns/:id/dispute", requireAuth(store, authVerifier), requireRole("business"), zParam(idParamSchema), zJson(disputeSchema), async (c) => {
    return ok(c, await services.campaigns.dispute(c.get("user"), c.req.valid("param").id, c.req.valid("json").reason));
  });
  app.post("/campaigns/:id/deliver", requireAuth(store, authVerifier), requireRole("influencer"), zParam(idParamSchema), zJson(deliverySubmitSchema), async (c) => {
    return ok(c, await services.delivery.submit(c.get("user"), c.req.valid("param").id, c.req.valid("json")));
  });
  app.get("/campaigns/:id/delivery/url", requireAuth(store, authVerifier), requireRole("business"), zParam(idParamSchema), async (c) => {
    return ok(c, await services.delivery.signedUrl(c.get("user"), c.req.valid("param").id));
  });

  app.post("/payment/create-escrow-order", requireAuth(store, authVerifier), requireRole("business"), zJson(createEscrowOrderSchema), async (c) => {
    return ok(c, await services.payments.createEscrowOrder(c.get("user"), c.req.valid("json").campaign_id));
  });
  app.post("/payment/create-order", requireAuth(store, authVerifier), requireRole("business"), zJson(createEscrowOrderSchema), async (c) => {
    return ok(c, await services.payments.createEscrowOrder(c.get("user"), c.req.valid("json").campaign_id));
  });
  app.post("/payment/verify-escrow", requireAuth(store, authVerifier), requireRole("business"), zJson(verifyEscrowSchema), async (c) => {
    return ok(c, await services.payments.verifyEscrow(c.get("user"), c.req.valid("json")));
  });
  app.post("/payment/verify", requireAuth(store, authVerifier), requireRole("business"), zJson(verifyEscrowSchema), async (c) => {
    return ok(c, await services.payments.verifyEscrow(c.get("user"), c.req.valid("json")));
  });
  app.post("/payment/create-booking-order", requireAuth(store, authVerifier), requireRole("business"), zJson(createBookingOrderSchema), async (c) => {
    return ok(c, await services.payments.createBookingOrder(c.req.valid("json")));
  });
  app.post("/payment/verify-booking-payment", requireAuth(store, authVerifier), requireRole("business"), zJson(verifyBookingPaymentSchema), async (c) => {
    return ok(c, await services.payments.verifyBookingPayment(c.get("user"), c.req.valid("json")));
  });
  app.post("/payment/capture-booking-payment", requireSecret("x-internal-secret", config.internalSecret, "internal secret"), zJson(campaignIdSchema), async (c) => {
    return ok(c, await services.payments.captureBookingPayment(c.req.valid("json").campaign_id));
  });
  app.post("/payment/release-escrow", zJson(campaignIdSchema), async (c) => {
    const user = await authOrCron(c, store, authVerifier, config.cronSecret);
    return ok(c, await services.payments.releaseEscrow(user, c.req.valid("json").campaign_id));
  });
  app.post("/payment/webhook", async (c) => {
    const body = await c.req.text();
    return ok(c, await services.payments.webhook(body, c.req.header("x-razorpay-signature")));
  });

  app.post("/delivery/upload", requireAuth(store, authVerifier), requireRole("influencer"), bodyLimit({ maxSize: 50 * 1024 * 1024 }), async (c) => {
    const form = await c.req.formData();
    const campaignId = form.get("campaignId");
    const file = form.get("file");
    if (typeof campaignId !== "string" || !(file instanceof File)) throw badRequest("VALIDATION_ERROR", "file and campaignId are required");
    return ok(c, await services.delivery.upload(c.get("user"), campaignId, file));
  });

  app.get("/inbox/influencer", requireAuth(store, authVerifier), requireRole("influencer"), async (c) => ok(c, await services.messaging.inbox(c.get("user"), "influencer")));
  app.get("/inbox/business", requireAuth(store, authVerifier), requireRole("business"), async (c) => ok(c, await services.messaging.inbox(c.get("user"), "business")));
  app.get("/campaigns/:id/messages", requireAuth(store, authVerifier), zParam(idParamSchema), async (c) => ok(c, await services.messaging.messages(c.get("user"), c.req.valid("param").id)));
  app.post("/campaigns/:id/messages", requireAuth(store, authVerifier), zParam(idParamSchema), zJson(messageCreateSchema), async (c) => {
    return created(c, await services.messaging.send(c.get("user"), c.req.valid("param").id, c.req.valid("json")));
  });
  app.patch("/campaigns/:id/messages/read", requireAuth(store, authVerifier), zParam(idParamSchema), async (c) => ok(c, await services.messaging.markRead(c.get("user"), c.req.valid("param").id)));
  app.post("/inbox/request-call", requireAuth(store, authVerifier), zJson(requestCallSchema), async (c) => ok(c, await services.messaging.requestCall(c.get("user"), c.req.valid("json").campaignId)));

  app.get("/notifications", requireAuth(store, authVerifier), async (c) => ok(c, await services.notifications.list(c.get("user"))));
  app.patch("/notifications/read", requireAuth(store, authVerifier), zJson(notificationsReadSchema), async (c) => ok(c, await services.notifications.markRead(c.get("user"), c.req.valid("json"))));

  app.get("/instagram/connect", requireAuth(store, authVerifier), zQuery(instagramConnectQuerySchema), async (c) => {
    const result = services.instagram.connect(c.req.valid("query"));
    setCookie(c, "ig_oauth_state", result.state, { httpOnly: true, sameSite: "Lax", path: "/" });
    return ok(c, { url: result.url });
  });
  app.get("/auth/callback/instagram", zQuery(instagramCallbackQuerySchema), async (c) => {
    const result = await services.instagram.callback(c.req.valid("query"), getCookie(c, "ig_oauth_state"));
    return c.redirect(result.redirectTo);
  });
  app.post("/instagram/sync", requireAuth(store, authVerifier), requireRole("influencer"), async (c) => ok(c, await services.instagram.sync(c.get("user"))));

  app.post("/ai/generate-profile", requireSecret("x-internal-secret", config.internalSecret, "internal secret"), zJson(aiGenerateSchema), async (c) => ok(c, await services.ai.influencer(c.req.valid("json").userId)));
  app.post("/ai/generate-business-profile", requireSecret("x-internal-secret", config.internalSecret, "internal secret"), zJson(aiGenerateSchema), async (c) => ok(c, await services.ai.business(c.req.valid("json").userId)));

  app.get("/cron/auto-release", requireSecret("x-cron-secret", config.cronSecret, "cron secret"), async (c) => ok(c, await services.cron.autoRelease()));

  app.post("/api/demo/login", async (c) => {
    if (!config.demoEnabled) throw forbidden("Demo login is disabled");
    return ok(c, { todo: "Demo login requires Supabase demo user configuration" });
  });

  return app;
}

function createDefaultProviders(config: EnvConfig): ProviderBundle {
  const providers: {
    payment?: PaymentProvider;
    email?: EmailProvider;
    instagram?: InstagramProvider;
    storage?: StorageProvider;
    ai?: AiProvider;
  } = {};
  if (config.razorpayKeyId && config.razorpayKeySecret) providers.payment = new RazorpayProvider(config);
  if (config.resendApiKey) providers.email = new ResendEmailProvider(config);
  if (config.instagramClientId && config.instagramAppSecret && config.instagramRedirectUri) providers.instagram = new MetaInstagramProvider(config);
  if (config.supabaseUrl && config.supabaseServiceRoleKey) providers.storage = new SupabaseStorageProvider(config);
  if (config.anthropicApiKey || config.googleAiKey) providers.ai = new ExternalAiProvider(config);
  return providers;
}

async function authOrCron(c: Context<AppEnv>, store: DataStore, verifyToken: AuthVerifier, cronSecret?: string): Promise<AuthUser | undefined> {
  if (cronSecret && c.req.header("x-cron-secret") === cronSecret) return undefined;
  const header = c.req.header("authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw unauthorized();
  const user = await verifyToken(token);
  const roleRow = await store.findOne<{ role: string }>("user_roles", { eq: { user_id: user.id } });
  if (roleRow?.role !== "business") throw forbidden("business role required");
  return user;
}

export default createApp;
