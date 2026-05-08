import type { CampaignStatus, NotificationType, UserRole } from "@plugoh/contracts";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  tooManyRequests,
  unauthorized,
} from "../core/errors.js";
import type { AiProvider, EmailProvider, InstagramProvider, PaymentProvider, StorageProvider } from "../clients/providers.js";
import { verifyHmacSha256 } from "../clients/providers.js";
import type { EnvConfig } from "../config/env.js";
import { requireConfig } from "../config/env.js";
import type { DataStore } from "../repositories/data-store.js";
import type { AuthUser } from "../types.js";

type Row = Record<string, any>;

const PLATFORM_FEE_RATE = 0.12;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type Services = {
  discovery: DiscoveryService;
  profiles: ProfileService;
  campaigns: CampaignService;
  payments: PaymentService;
  delivery: DeliveryService;
  messaging: MessagingService;
  notifications: NotificationService;
  instagram: InstagramService;
  ai: AiProfileService;
  earnings: EarningsService;
  cron: CronService;
};

export type ProviderBundle = {
  payment?: PaymentProvider;
  email?: EmailProvider;
  instagram?: InstagramProvider;
  storage?: StorageProvider;
  ai?: AiProvider;
};

export function createServices(store: DataStore, providers: ProviderBundle, config: EnvConfig): Services {
  const notifications = new NotificationService(store);
  const campaignCore = new CampaignService(store, notifications, providers.payment);
  const payments = new PaymentService(store, notifications, campaignCore, config, providers.payment);
  return {
    discovery: new DiscoveryService(store),
    profiles: new ProfileService(store),
    campaigns: campaignCore,
    payments,
    delivery: new DeliveryService(store, notifications, providers.storage),
    messaging: new MessagingService(store, providers.email),
    notifications,
    instagram: new InstagramService(store, providers.instagram),
    ai: new AiProfileService(store, providers.ai),
    earnings: new EarningsService(store),
    cron: new CronService(store, notifications, payments, providers.payment),
  };
}

function nowIso() {
  return new Date().toISOString();
}

function futureIso(ms: number) {
  return new Date(Date.now() + ms).toISOString();
}

function paise(rupees: number) {
  return Math.round(rupees * 100);
}

function platformFee(price: number) {
  return Number((price * PLATFORM_FEE_RATE).toFixed(2));
}

function starterPrice(profile: Row) {
  return Math.min(
    profile.price_per_reel ?? Number.POSITIVE_INFINITY,
    profile.price_per_post ?? Number.POSITIVE_INFINITY,
    profile.price_per_story ?? Number.POSITIVE_INFINITY,
  );
}

function assertUser(user?: AuthUser): AuthUser {
  if (!user) throw unauthorized();
  return user;
}

async function campaignForParticipant(store: DataStore, campaignId: string, userId: string) {
  const campaign = await store.getById<Row>("campaigns", campaignId);
  if (!campaign) throw notFound("Campaign");
  if (campaign.business_id !== userId && campaign.influencer_id !== userId) throw forbidden("Campaign participant required");
  return campaign;
}

async function requireCampaignRole(store: DataStore, campaignId: string, userId: string, role: "business" | "influencer") {
  const campaign = await store.getById<Row>("campaigns", campaignId);
  if (!campaign) throw notFound("Campaign");
  const key = role === "business" ? "business_id" : "influencer_id";
  if (campaign[key] !== userId) throw forbidden(`${role} on campaign required`);
  return campaign;
}

function requireStatus(campaign: Row, statuses: CampaignStatus[]) {
  if (!statuses.includes(campaign.status)) {
    throw conflict("INVALID_CAMPAIGN_STATUS", `Campaign must be in status: ${statuses.join(", ")}`);
  }
}

export class NotificationService {
  constructor(private readonly store: DataStore) {}

  async list(user: AuthUser) {
    return this.store.list<Row>("notifications", {
      eq: { user_id: user.id },
      order: { column: "created_at", ascending: false },
    });
  }

  async markRead(user: AuthUser, input: { ids?: string[]; all?: boolean }) {
    const options = input.all ? { eq: { user_id: user.id } } : { eq: { user_id: user.id }, in: { id: input.ids ?? [] } };
    await this.store.update("notifications", options, { read: true });
    return { ok: true };
  }

  async create(userId: string, type: NotificationType, data: Row = {}) {
    await this.store.insert("notifications", {
      user_id: userId,
      type,
      data,
      read: false,
      created_at: nowIso(),
    });
  }

  async createForMany(userIds: string[], type: NotificationType, data: Row = {}) {
    await Promise.all(userIds.map((userId) => this.create(userId, type, data)));
  }
}

export class DiscoveryService {
  constructor(private readonly store: DataStore) {}

  async list(query: Row) {
    const options = {
      eq: {
        is_active: true,
        ...(query.place && query.place !== "All" ? { city: query.place } : {}),
        ...(query.category && query.category !== "All" ? { category: query.category } : {}),
      },
      ...(query.search
        ? {
            or: ["display_name", "instagram_handle", "ig_username", "bio", "category", "city"]
              .map((field) => `${field}.ilike.%${String(query.search).replaceAll("%", "\\%")}%`)
              .join(","),
          }
        : {}),
    };
    let profiles = await this.store.list<Row>("influencer_profiles", options);
    if (query.search && profiles.length === 0) {
      const term = String(query.search).toLowerCase();
      profiles = profiles.filter((profile) =>
        ["display_name", "instagram_handle", "ig_username", "bio", "category", "city"].some((key) =>
          String(profile[key] ?? "").toLowerCase().includes(term),
        ),
      );
    }
    if (query.price_min !== undefined) profiles = profiles.filter((profile) => starterPrice(profile) >= Number(query.price_min));
    if (query.price_max !== undefined) profiles = profiles.filter((profile) => starterPrice(profile) <= Number(query.price_max));
    profiles = profiles.map((profile) => ({ ...profile, starterPrice: Number.isFinite(starterPrice(profile)) ? starterPrice(profile) : null }));
    switch (query.sort) {
      case "followers_desc":
        profiles.sort((a, b) => (b.follower_count ?? b.ig_followers_count ?? 0) - (a.follower_count ?? a.ig_followers_count ?? 0));
        break;
      case "engagement_asc":
        profiles.sort((a, b) => (a.avg_likes_per_reel ?? 0) - (b.avg_likes_per_reel ?? 0));
        break;
      case "engagement_desc":
        profiles.sort((a, b) => (b.avg_likes_per_reel ?? 0) - (a.avg_likes_per_reel ?? 0));
        break;
      case "price_asc":
        profiles.sort((a, b) => (a.starterPrice ?? Infinity) - (b.starterPrice ?? Infinity));
        break;
      case "price_desc":
        profiles.sort((a, b) => (b.starterPrice ?? 0) - (a.starterPrice ?? 0));
        break;
    }
    return profiles;
  }

  async get(id: string) {
    const profile = await this.store.getById<Row>("influencer_profiles", id);
    if (!profile || profile.is_active !== true) throw notFound("Influencer");
    const media = await this.store.list<Row>("instagram_media", {
      eq: { user_id: profile.user_id },
      order: { column: "engagement", ascending: false },
      limit: 3,
    });
    return { ...profile, media };
  }
}

export class ProfileService {
  constructor(private readonly store: DataStore) {}

  async getInfluencer(user: AuthUser) {
    const profile = await this.store.findOne<Row>("influencer_profiles", { eq: { user_id: user.id } });
    if (!profile) throw notFound("Influencer profile");
    return profile;
  }

  async updateInfluencer(user: AuthUser, input: Row) {
    const [profile] = await this.store.update<Row>("influencer_profiles", { eq: { user_id: user.id } }, input);
    if (!profile) throw notFound("Influencer profile");
    return profile;
  }

  async getPayout(user: AuthUser) {
    return this.store.findOne<Row>("influencer_payout_details", { eq: { user_id: user.id } });
  }

  async upsertPayout(user: AuthUser, input: Row) {
    return this.store.upsert<Row>(
      "influencer_payout_details",
      { ...input, user_id: user.id, updated_at: nowIso() },
      "user_id",
    );
  }

  async getBusiness(user: AuthUser) {
    const profile = await this.store.findOne<Row>("business_profiles", { eq: { user_id: user.id } });
    if (!profile) throw notFound("Business profile");
    return profile;
  }

  async updateBusiness(user: AuthUser, input: Row) {
    const [profile] = await this.store.update<Row>("business_profiles", { eq: { user_id: user.id } }, input);
    if (!profile) throw notFound("Business profile");
    return profile;
  }

  async assertBusinessComplete(userId: string) {
    const profile = await this.store.findOne<Row>("business_profiles", { eq: { user_id: userId } });
    if (!profile) throw forbidden("Business profile required before booking");
    const hasName = String(profile.brand_name ?? "").trim().length > 0;
    const hasIdentity = Boolean(profile.ig_username || profile.brand_type);
    if (!hasName || !hasIdentity) throw forbidden("Business profile is incomplete");
    return profile;
  }
}

export class CampaignService {
  constructor(
    private readonly store: DataStore,
    private readonly notifications: NotificationService,
    private readonly payment?: PaymentProvider,
  ) {}

  async create(user: AuthUser, input: Row, paymentInput: Partial<Row> = {}) {
    const profileService = new ProfileService(this.store);
    await profileService.assertBusinessComplete(user.id);
    const influencer = await this.store.findOne<Row>("influencer_profiles", {
      eq: { id: input.influencer_profile_id, user_id: input.influencer_id, is_active: true },
    });
    if (!influencer) throw notFound("Influencer profile");
    const fee = platformFee(input.price_offered);
    const title = `${input.objective.replaceAll("_", " ")} with ${influencer.display_name ?? influencer.ig_username ?? "influencer"}`;
    const brief = [
      `Objective: ${input.objective}`,
      `Package: ${input.package_type}`,
      `Timing: ${input.timing_mode}${input.due_date ? ` (${input.due_date})` : ""}`,
      input.event_name ? `Venue: ${input.event_name}` : undefined,
    ]
      .filter(Boolean)
      .join("\n");
    const campaign = await this.store.insert<Row>("campaigns", {
      business_id: user.id,
      influencer_id: input.influencer_id,
      influencer_profile_id: input.influencer_profile_id,
      title,
      brief,
      package_type: input.package_type,
      price_offered: input.price_offered,
      advance_amount: 0,
      status: paymentInput.status ?? "requested",
      payment_status: paymentInput.payment_status ?? "unpaid",
      payment_method: paymentInput.payment_method,
      razorpay_order_id: paymentInput.razorpay_order_id,
      razorpay_payment_id: paymentInput.razorpay_payment_id,
      platform_fee_amount: fee,
      total_charged_amount: input.price_offered + fee,
      business_contact_email: input.contact_email,
      business_contact_phone: input.contact_phone,
      expires_at: paymentInput.expires_at ?? futureIso(48 * HOUR_MS),
      payment_captured_at: paymentInput.payment_captured_at,
      created_at: nowIso(),
      updated_at: nowIso(),
    });
    await this.notifications.create(input.influencer_id, "new_booking", this.notificationData(campaign, influencer));
    await this.store.insert("campaign_messages", {
      campaign_id: campaign.id,
      sender_id: user.id,
      message_type: "booking_card",
      content: title,
      metadata: { campaignId: campaign.id },
      read_by: [user.id],
      created_at: nowIso(),
    });
    return { campaignId: campaign.id };
  }

  async list(user: AuthUser, role: UserRole) {
    const key = role === "business" ? "business_id" : "influencer_id";
    const campaigns = await this.store.list<Row>("campaigns", {
      eq: { [key]: user.id },
      order: { column: "created_at", ascending: false },
    });
    return this.withProfilesMany(campaigns);
  }

  async get(user: AuthUser, id: string) {
    const campaign = await campaignForParticipant(this.store, id, user.id);
    const delivery = await this.store.findOne<Row>("deliveries", { eq: { campaign_id: id } });
    const messages = await this.store.list<Row>("campaign_messages", {
      eq: { campaign_id: id },
      order: { column: "created_at", ascending: true },
    });
    return { ...(await this.withProfiles(campaign)), delivery, messages };
  }

  async accept(user: AuthUser, id: string) {
    const campaign = await requireCampaignRole(this.store, id, user.id, "influencer");
    requireStatus(campaign, ["requested", "payment_pending", "pre_authorized"]);
    if (campaign.status === "pre_authorized") {
      if (campaign.payment_method === "card") await this.payment?.capturePayment(campaign.razorpay_payment_id, paise(campaign.total_charged_amount));
      await this.store.update("campaigns", { eq: { id } }, {
        status: "in_escrow",
        payment_status: "paid",
        accepted_at: nowIso(),
        payment_captured_at: nowIso(),
      });
      await this.store.insert("escrow_transactions", {
        campaign_id: id,
        type: "escrow_lock",
        amount_paise: paise(campaign.total_charged_amount),
        platform_fee_paise: paise(campaign.platform_fee_amount),
        razorpay_order_id: campaign.razorpay_order_id,
        razorpay_payment_id: campaign.razorpay_payment_id,
        status: "success",
        created_at: nowIso(),
      });
    } else {
      await this.store.update("campaigns", { eq: { id } }, {
        status: "payment_pending",
        expires_at: futureIso(24 * HOUR_MS),
        accepted_at: nowIso(),
      });
    }
    await this.notifications.create(campaign.business_id, "booking_accepted", this.notificationData(campaign));
    return { ok: true };
  }

  async decline(user: AuthUser, id: string) {
    const campaign = await requireCampaignRole(this.store, id, user.id, "influencer");
    requireStatus(campaign, ["requested", "payment_pending", "pre_authorized"]);
    if (campaign.status === "pre_authorized" && campaign.payment_method === "upi" && campaign.razorpay_payment_id) {
      await this.payment?.refundPayment(campaign.razorpay_payment_id, paise(campaign.total_charged_amount));
    }
    await this.store.update("campaigns", { eq: { id } }, { status: "declined" });
    await this.notifications.create(campaign.business_id, "booking_rejected", this.notificationData(campaign));
    return { ok: true };
  }

  async approve(user: AuthUser, id: string) {
    const campaign = await requireCampaignRole(this.store, id, user.id, "business");
    requireStatus(campaign, ["delivery_submitted"]);
    await this.release(campaign, user.id);
    return { ok: true };
  }

  async dispute(user: AuthUser, id: string, reason: string) {
    const campaign = await requireCampaignRole(this.store, id, user.id, "business");
    requireStatus(campaign, ["delivery_submitted"]);
    await this.store.update("deliveries", { eq: { campaign_id: id } }, { dispute_reason: reason, disputed_at: nowIso() });
    await this.store.update("campaigns", { eq: { id } }, { status: "disputed" });
    await this.notifications.createForMany([campaign.business_id, campaign.influencer_id], "delivery_disputed", this.notificationData(campaign));
    return { ok: true };
  }

  async release(campaign: Row, approvedBy?: string, notify = true) {
    const existingLedger = await this.store.list<Row>("escrow_transactions", {
      eq: { campaign_id: campaign.id },
      in: { type: ["payout_influencer", "platform_fee"] },
    });
    const hasPayout = existingLedger.some((row) => row.type === "payout_influencer");
    const hasPlatformFee = existingLedger.some((row) => row.type === "platform_fee");
    if (campaign.status === "completed" && hasPayout && hasPlatformFee) return { alreadyReleased: true };

    await this.store.update("deliveries", { eq: { campaign_id: campaign.id } }, { approved_at: nowIso(), approved_by: approvedBy });
    await this.store.update("campaigns", { eq: { id: campaign.id } }, { status: "completed", completed_at: campaign.completed_at ?? nowIso() });
    if (!hasPayout) {
      await this.store.insert("escrow_transactions", {
        campaign_id: campaign.id,
        type: "payout_influencer",
        amount_paise: paise(campaign.price_offered),
        status: "pending",
        created_at: nowIso(),
      });
    }
    if (!hasPlatformFee) {
      await this.store.insert("escrow_transactions", {
        campaign_id: campaign.id,
        type: "platform_fee",
        amount_paise: paise(campaign.platform_fee_amount),
        platform_fee_paise: paise(campaign.platform_fee_amount),
        status: "success",
        created_at: nowIso(),
      });
    }
    if (notify && campaign.status !== "completed") {
      await this.notifications.create(campaign.influencer_id, "booking_completed", this.notificationData(campaign));
    }
    return { alreadyReleased: false };
  }

  async withProfiles(campaign: Row) {
    const [business, influencer] = await Promise.all([
      this.store.findOne<Row>("business_profiles", { eq: { user_id: campaign.business_id } }),
      this.store.findOne<Row>("influencer_profiles", { eq: { user_id: campaign.influencer_id } }),
    ]);
    return { ...campaign, business_profile: business, influencer_profile: influencer };
  }

  async withProfilesMany(campaigns: Row[]) {
    if (campaigns.length === 0) return [];
    const businessIds = [...new Set(campaigns.map((campaign) => campaign.business_id).filter(Boolean))];
    const influencerIds = [...new Set(campaigns.map((campaign) => campaign.influencer_id).filter(Boolean))];
    const [businessProfiles, influencerProfiles] = await Promise.all([
      businessIds.length ? this.store.list<Row>("business_profiles", { in: { user_id: businessIds } }) : [],
      influencerIds.length ? this.store.list<Row>("influencer_profiles", { in: { user_id: influencerIds } }) : [],
    ]);
    const businessByUserId = new Map(businessProfiles.map((profile) => [profile.user_id, profile]));
    const influencerByUserId = new Map(influencerProfiles.map((profile) => [profile.user_id, profile]));
    return campaigns.map((campaign) => ({
      ...campaign,
      business_profile: businessByUserId.get(campaign.business_id) ?? null,
      influencer_profile: influencerByUserId.get(campaign.influencer_id) ?? null,
    }));
  }

  notificationData(campaign: Row, influencer?: Row) {
    return {
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      influencerName: influencer?.display_name,
      amount: campaign.price_offered,
    };
  }
}

export class PaymentService {
  constructor(
    private readonly store: DataStore,
    private readonly notifications: NotificationService,
    private readonly campaigns: CampaignService,
    private readonly config: EnvConfig,
    private readonly payment?: PaymentProvider,
  ) {}

  private requirePayment() {
    if (!this.payment) throw badRequest("PAYMENT_PROVIDER_UNAVAILABLE", "Payment provider is not configured");
    return this.payment;
  }

  async createEscrowOrder(user: AuthUser, campaignId: string) {
    const campaign = await requireCampaignRole(this.store, campaignId, user.id, "business");
    requireStatus(campaign, ["payment_pending"]);
    const provider = this.requirePayment();
    const order = campaign.razorpay_order_id
      ? await provider.fetchOrder(campaign.razorpay_order_id)
      : await provider.createOrder({ amount: paise(campaign.total_charged_amount), currency: "INR", receipt: campaign.id });
    if (!campaign.razorpay_order_id) await this.store.update("campaigns", { eq: { id: campaign.id } }, { razorpay_order_id: order.id });
    return { orderId: order.id, amount: order.amount, currency: order.currency };
  }

  async verifyEscrow(user: AuthUser, input: Row) {
    const campaign = await requireCampaignRole(this.store, input.campaign_id, user.id, "business");
    if (campaign.status === "in_escrow" && campaign.razorpay_payment_id === input.razorpay_payment_id) {
      return { success: true, campaignId: campaign.id };
    }
    requireStatus(campaign, ["payment_pending"]);
    const provider = this.requirePayment();
    if (!provider.verifySignature({ orderId: input.razorpay_order_id, paymentId: input.razorpay_payment_id, signature: input.razorpay_signature })) {
      throw forbidden("Invalid Razorpay signature");
    }
    const payment = await provider.fetchPayment(input.razorpay_payment_id);
    await this.store.update("campaigns", { eq: { id: campaign.id } }, {
      status: "in_escrow",
      payment_status: "paid",
      payment_method: payment.method,
      razorpay_payment_id: input.razorpay_payment_id,
      payment_captured_at: nowIso(),
    });
    await this.store.insert("escrow_transactions", {
      campaign_id: campaign.id,
      type: "escrow_lock",
      amount_paise: paise(campaign.total_charged_amount),
      platform_fee_paise: paise(campaign.platform_fee_amount),
      razorpay_order_id: input.razorpay_order_id,
      razorpay_payment_id: input.razorpay_payment_id,
      status: "success",
      created_at: nowIso(),
    });
    await this.notifications.create(campaign.influencer_id, "payment_secured", this.campaigns.notificationData(campaign));
    return { success: true, campaignId: campaign.id };
  }

  async createBookingOrder(input: Row) {
    const fee = platformFee(input.price_offered);
    const total = input.price_offered + fee;
    const order = await this.requirePayment().createOrder({ amount: paise(total), currency: "INR", payment_capture: 0 });
    return { orderId: order.id, amount: order.amount, currency: order.currency, platformFee: fee, total };
  }

  async verifyBookingPayment(user: AuthUser, input: Row) {
    const existing = await this.store.findOne<Row>("campaigns", { eq: { razorpay_order_id: input.razorpay_order_id } });
    if (existing) return { success: true, campaignId: existing.id };
    const provider = this.requirePayment();
    if (!provider.verifySignature({ orderId: input.razorpay_order_id, paymentId: input.razorpay_payment_id, signature: input.razorpay_signature })) {
      throw forbidden("Invalid Razorpay signature");
    }
    const payment = await provider.fetchPayment(input.razorpay_payment_id);
    const created = await this.campaigns.create(user, input, {
      status: "pre_authorized",
      payment_status: payment.method === "upi" ? "paid" : "authorized",
      payment_method: payment.method,
      razorpay_order_id: input.razorpay_order_id,
      razorpay_payment_id: input.razorpay_payment_id,
      payment_captured_at: payment.method === "upi" ? nowIso() : undefined,
      expires_at: futureIso(24 * HOUR_MS),
    });
    const campaign = await this.store.getById<Row>("campaigns", created.campaignId);
    await this.store.insert("escrow_transactions", {
      campaign_id: created.campaignId,
      type: "escrow_lock",
      amount_paise: paise(campaign?.total_charged_amount ?? 0),
      platform_fee_paise: paise(campaign?.platform_fee_amount ?? 0),
      razorpay_order_id: input.razorpay_order_id,
      razorpay_payment_id: input.razorpay_payment_id,
      status: payment.method === "upi" ? "success" : "pending",
      created_at: nowIso(),
    });
    return { success: true, campaignId: created.campaignId };
  }

  async captureBookingPayment(campaignId: string) {
    const campaign = await this.store.getById<Row>("campaigns", campaignId);
    if (!campaign) throw notFound("Campaign");
    if (campaign.payment_method === "card") {
      await this.requirePayment().capturePayment(campaign.razorpay_payment_id, paise(campaign.total_charged_amount));
    }
    return { ok: true };
  }

  async releaseEscrow(user: AuthUser | undefined, campaignId: string, notify = true) {
    const campaign = user
      ? await requireCampaignRole(this.store, campaignId, user.id, "business")
      : await this.store.getById<Row>("campaigns", campaignId);
    if (!campaign) throw notFound("Campaign");
    requireStatus(campaign, ["delivery_submitted", "completed"]);
    return { ok: true, ...(await this.campaigns.release(campaign, user?.id, notify)) };
  }

  async webhook(rawBody: string, signature?: string) {
    if (!this.config.razorpayWebhookSecret) throw forbidden("Razorpay webhook secret is not configured");
    if (!signature || !verifyHmacSha256({ body: rawBody, signature, secret: this.config.razorpayWebhookSecret })) {
      throw forbidden("Invalid Razorpay webhook signature");
    }
    let event: Row;
    try {
      event = JSON.parse(rawBody) as Row;
    } catch {
      throw badRequest("INVALID_WEBHOOK_BODY", "Razorpay webhook body must be valid JSON");
    }
    if (event.event === "payment.failed") {
      const orderId = event.payload?.payment?.entity?.order_id;
      if (orderId) {
        await this.store.update("campaigns", { eq: { razorpay_order_id: orderId } }, { payment_status: "unpaid" });
      }
    }
    if (event.event === "refund.processed") {
      const refund = event.payload?.refund?.entity;
      if (refund?.id) {
        await this.store.update("escrow_transactions", { eq: { razorpay_refund_id: refund.id } }, { status: "success" });
      }
    }
    return { ok: true };
  }
}

export class DeliveryService {
  constructor(
    private readonly store: DataStore,
    private readonly notifications: NotificationService,
    private readonly storage?: StorageProvider,
  ) {}

  async upload(user: AuthUser, campaignId: string, file: File) {
    const campaign = await requireCampaignRole(this.store, campaignId, user.id, "influencer");
    requireStatus(campaign, ["in_escrow"]);
    if (file.size > 50 * 1024 * 1024) throw badRequest("FILE_TOO_LARGE", "Delivery files must be 50 MB or smaller");
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/quicktime", "video/webm", "application/pdf", "application/zip"];
    if (!allowed.includes(file.type)) throw badRequest("UNSUPPORTED_FILE_TYPE", "Unsupported delivery file type");
    if (!this.storage) throw badRequest("STORAGE_PROVIDER_UNAVAILABLE", "Storage provider is not configured");
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${campaignId}/${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const storagePath = await this.storage.uploadDelivery({ path, file });
    return { storagePath };
  }

  async submit(user: AuthUser, id: string, input: Row) {
    const campaign = await requireCampaignRole(this.store, id, user.id, "influencer");
    requireStatus(campaign, ["in_escrow"]);
    const existing = await this.store.findOne<Row>("deliveries", { eq: { campaign_id: id } });
    if (existing) throw conflict("DELIVERY_ALREADY_SUBMITTED", "Delivery has already been submitted for this campaign");
    await this.store.insert("deliveries", {
      campaign_id: id,
      submitted_by: user.id,
      content_url: input.storagePath,
      notes: input.notes,
      submitted_at: nowIso(),
      created_at: nowIso(),
      updated_at: nowIso(),
    });
    await this.store.update("campaigns", { eq: { id } }, { status: "delivery_submitted", delivery_submitted_at: nowIso() });
    await this.notifications.create(campaign.business_id, "delivery_submitted", { campaignId: id, campaignTitle: campaign.title });
    return { ok: true };
  }

  async signedUrl(user: AuthUser, id: string) {
    await requireCampaignRole(this.store, id, user.id, "business");
    const delivery = await this.store.findOne<Row>("deliveries", { eq: { campaign_id: id } });
    if (!delivery) throw notFound("Delivery");
    if (!this.storage) throw badRequest("STORAGE_PROVIDER_UNAVAILABLE", "Storage provider is not configured");
    const signedUrl = await this.storage.signedUrl(delivery.content_url, 3600);
    return { signedUrl, expiresAt: new Date(Date.now() + HOUR_MS).toISOString() };
  }
}

export class MessagingService {
  constructor(private readonly store: DataStore, private readonly email?: EmailProvider) {}

  async inbox(user: AuthUser, role: UserRole) {
    const key = role === "business" ? "business_id" : "influencer_id";
    const campaigns = await this.store.list<Row>("campaigns", { eq: { [key]: user.id } });
    const campaignIds = campaigns.map((campaign) => campaign.id);
    const messages = campaignIds.length
      ? await this.store.list<Row>("campaign_messages", { in: { campaign_id: campaignIds }, order: { column: "created_at", ascending: false } })
      : [];
    const messagesByCampaignId = new Map<string, Row[]>();
    for (const message of messages) {
      const rows = messagesByCampaignId.get(message.campaign_id) ?? [];
      rows.push(message);
      messagesByCampaignId.set(message.campaign_id, rows);
    }
    const rows = campaigns.map((campaign) => {
      const campaignMessages = messagesByCampaignId.get(campaign.id) ?? [];
      const latest = campaignMessages[0] ?? null;
      const unread = campaignMessages.filter((message) => !Array.isArray(message.read_by) || !message.read_by.includes(user.id)).length;
      return { campaign, latestMessage: latest, unreadCount: unread };
    });
    return rows.sort((a, b) => String(b.latestMessage?.created_at ?? b.campaign.created_at).localeCompare(String(a.latestMessage?.created_at ?? a.campaign.created_at)));
  }

  async messages(user: AuthUser, id: string) {
    await campaignForParticipant(this.store, id, user.id);
    return this.store.list<Row>("campaign_messages", { eq: { campaign_id: id }, order: { column: "created_at", ascending: true } });
  }

  async send(user: AuthUser, id: string, input: Row) {
    await campaignForParticipant(this.store, id, user.id);
    return this.store.insert<Row>("campaign_messages", {
      campaign_id: id,
      sender_id: user.id,
      message_type: input.message_type,
      content: input.content,
      metadata: {},
      read_by: [user.id],
      created_at: nowIso(),
    });
  }

  async markRead(user: AuthUser, id: string) {
    await campaignForParticipant(this.store, id, user.id);
    const messages = await this.store.list<Row>("campaign_messages", { eq: { campaign_id: id } });
    await Promise.all(messages.map((message) => {
      const readBy = new Set<string>(Array.isArray(message.read_by) ? message.read_by : []);
      readBy.add(user.id);
      return this.store.update("campaign_messages", { eq: { id: message.id } }, { read_by: [...readBy] });
    }));
    return { ok: true };
  }

  async requestCall(user: AuthUser, campaignId: string) {
    const campaign = await campaignForParticipant(this.store, campaignId, user.id);
    const recent = await this.store.findOne<Row>("campaign_messages", {
      eq: { campaign_id: campaignId, sender_id: user.id, message_type: "system", content: "call_requested" },
    });
    if (recent && Date.parse(recent.created_at) > Date.now() - 6 * HOUR_MS) throw tooManyRequests("Call already requested in the last 6 hours");
    await this.store.insert("campaign_messages", {
      campaign_id: campaignId,
      sender_id: user.id,
      message_type: "system",
      content: "call_requested",
      metadata: {},
      read_by: [user.id],
      created_at: nowIso(),
    });
    if (this.email) {
      const otherUserId = campaign.business_id === user.id ? campaign.influencer_id : campaign.business_id;
      const profile = await this.store.findOne<Row>("profiles", { eq: { id: otherUserId } });
      if (profile?.email) await this.email.sendCallRequest({ to: profile.email, subject: "Plugoh call request", html: `<p>A call was requested for ${campaign.title}.</p>` });
    }
    return { ok: true };
  }
}

export class InstagramService {
  constructor(private readonly store: DataStore, private readonly instagram?: InstagramProvider) {}

  connect(input: { userId: string; role: UserRole }) {
    if (!this.instagram) throw badRequest("INSTAGRAM_PROVIDER_UNAVAILABLE", "Instagram provider is not configured");
    const state = `${input.role}:${crypto.randomUUID()}:${input.userId}`;
    const scopes = ["instagram_basic", "instagram_content_publish", "instagram_manage_insights", "pages_show_list", "pages_read_engagement"];
    return { state, url: this.instagram.buildOAuthUrl({ state, scopes }) };
  }

  async callback(input: { code: string; state: string }, cookieState?: string) {
    if (!cookieState || cookieState !== input.state) throw forbidden("Invalid Instagram OAuth state");
    if (!this.instagram) throw badRequest("INSTAGRAM_PROVIDER_UNAVAILABLE", "Instagram provider is not configured");
    const [role, , userId] = input.state.split(":") as [UserRole, string, string];
    const token = await this.instagram.exchangeCode(input.code);
    const profile = await this.instagram.fetchProfile(token.accessToken);
    if (role === "influencer") {
      const media = await this.instagram.fetchMedia(token.accessToken);
      await this.store.upsert("influencer_profiles", {
        user_id: userId,
        ...profile,
        ...instagramAverages(media),
        access_token: token.accessToken,
        token_expires_at: token.expiresAt,
        is_active: true,
      }, "user_id");
      await Promise.all(media.map((item) => this.store.upsert("instagram_media", { user_id: userId, ...item, synced_at: nowIso() }, "user_id,ig_media_id")));
      return { redirectTo: "/dashboard/influencer/profile?source=onboarding" };
    }
    await this.store.upsert("business_profiles", { user_id: userId, ...profile, access_token: token.accessToken, token_expires_at: token.expiresAt, instagram_connected_at: nowIso() }, "user_id");
    return { redirectTo: "/dashboard/business/profile?source=onboarding" };
  }

  async sync(user: AuthUser) {
    if (!this.instagram) throw badRequest("INSTAGRAM_PROVIDER_UNAVAILABLE", "Instagram provider is not configured");
    const profile = await this.store.findOne<Row>("influencer_profiles", { eq: { user_id: user.id } });
    if (!profile?.access_token) throw badRequest("INSTAGRAM_NOT_CONNECTED", "Instagram is not connected");
    const media = await this.instagram.fetchMedia(profile.access_token);
    await Promise.all(media.map((item) => this.store.upsert("instagram_media", { user_id: user.id, ...item, synced_at: nowIso() }, "user_id,ig_media_id")));
    await this.store.update("influencer_profiles", { eq: { user_id: user.id } }, instagramAverages(media));
    return { synced: media.length };
  }
}

function instagramAverages(media: Row[]) {
  const reels = media.filter((item) => ["VIDEO", "REELS_VIDEO"].includes(String(item.media_type)));
  const sample = reels.length ? reels : media;
  const count = sample.length || 1;
  return {
    avg_likes_per_reel: sample.reduce((sum, item) => sum + Number(item.like_count ?? 0), 0) / count,
    avg_views_per_reel: sample.reduce((sum, item) => sum + Number(item.video_views ?? item.impressions ?? 0), 0) / count,
  };
}

export class AiProfileService {
  constructor(private readonly store: DataStore, private readonly ai?: AiProvider) {}

  async influencer(userId: string) {
    if (!this.ai) throw badRequest("AI_PROVIDER_UNAVAILABLE", "AI provider is not configured");
    const profile = await this.store.findOne<Row>("influencer_profiles", { eq: { user_id: userId } });
    if (!profile) throw notFound("Influencer profile");
    const media = await this.store.list<Row>("instagram_media", { eq: { user_id: userId }, order: { column: "engagement", ascending: false }, limit: 20 });
    const generated = await this.ai.generateInfluencerProfile({ profile, media });
    const patch = Object.fromEntries(Object.entries(generated).filter(([key]) => profile[key] == null));
    if (Object.keys(patch).length) await this.store.update("influencer_profiles", { eq: { user_id: userId } }, patch);
    return { ok: true };
  }

  async business(userId: string) {
    if (!this.ai) throw badRequest("AI_PROVIDER_UNAVAILABLE", "AI provider is not configured");
    const profile = await this.store.findOne<Row>("business_profiles", { eq: { user_id: userId } });
    if (!profile) throw notFound("Business profile");
    const generated = await this.ai.generateBusinessProfile({ profile });
    const patch = Object.fromEntries(Object.entries(generated).filter(([key]) => profile[key] == null));
    if (Object.keys(patch).length) await this.store.update("business_profiles", { eq: { user_id: userId } }, patch);
    return { ok: true };
  }
}

export class EarningsService {
  constructor(private readonly store: DataStore) {}

  async summary(user: AuthUser) {
    const campaigns = await this.store.list<Row>("campaigns", { eq: { influencer_id: user.id } });
    const relevant = campaigns.filter((campaign) => ["in_escrow", "delivery_submitted", "completed"].includes(campaign.status));
    const completed = relevant.filter((campaign) => campaign.status === "completed");
    const pending = relevant.filter((campaign) => ["in_escrow", "delivery_submitted"].includes(campaign.status));
    const total = completed.reduce((sum, campaign) => sum + Number(campaign.price_offered ?? 0), 0);
    const currentMonth = new Date().toISOString().slice(0, 7);
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthKey = lastMonthDate.toISOString().slice(0, 7);
    const byMonth = new Map<string, number>();
    for (const campaign of completed) {
      const month = String(campaign.completed_at ?? campaign.created_at).slice(0, 7);
      byMonth.set(month, (byMonth.get(month) ?? 0) + Number(campaign.price_offered ?? 0));
    }
    const thisMonth = byMonth.get(currentMonth) ?? 0;
    const lastMonth = byMonth.get(lastMonthKey) ?? 0;
    return {
      total_earnings: total,
      pending_earnings: pending.reduce((sum, campaign) => sum + Number(campaign.price_offered ?? 0), 0),
      this_month: thisMonth,
      last_month: lastMonth,
      month_over_month_change: lastMonth === 0 ? (thisMonth > 0 ? 1 : 0) : (thisMonth - lastMonth) / lastMonth,
      monthly_breakdown: [...byMonth.entries()].map(([month, amount]) => ({ month, amount })),
      transactions: completed.map((campaign) => ({ campaignId: campaign.id, title: campaign.title, amount: campaign.price_offered, status: campaign.status, date: campaign.completed_at })),
      tier: total >= 500000 ? "macro" : total >= 100000 ? "mid" : total >= 10000 ? "micro" : "nano",
      tier_progress: total >= 500000 ? 1 : total >= 100000 ? total / 500000 : total >= 10000 ? total / 100000 : total / 10000,
    };
  }
}

export class CronService {
  constructor(
    private readonly store: DataStore,
    private readonly notifications: NotificationService,
    private readonly payments: PaymentService,
    private readonly payment?: PaymentProvider,
  ) {}

  async autoRelease() {
    let autoReleased = 0;
    let expired = 0;
    const cutoff = new Date(Date.now() - 7 * DAY_MS).toISOString();
    const deliverySubmitted = await this.store.list<Row>("campaigns", { eq: { status: "delivery_submitted" }, lt: { delivery_submitted_at: cutoff } });
    for (const campaign of deliverySubmitted) {
      await this.payments.releaseEscrow(undefined, campaign.id, false);
      await this.notifications.createForMany([campaign.business_id, campaign.influencer_id], "booking_completed", { campaignId: campaign.id });
      autoReleased += 1;
    }
    for (const status of ["requested", "payment_pending", "pre_authorized"] as const) {
      const rows = await this.store.list<Row>("campaigns", { eq: { status }, lt: { expires_at: nowIso() } });
      for (const campaign of rows) {
        if (status === "pre_authorized" && campaign.payment_method === "upi" && campaign.razorpay_payment_id) {
          await this.payment?.refundPayment(campaign.razorpay_payment_id, paise(campaign.total_charged_amount));
        }
        await this.store.update("campaigns", { eq: { id: campaign.id } }, { status: "expired" });
        const recipients = status === "requested" ? [campaign.business_id] : [campaign.business_id, campaign.influencer_id];
        await this.notifications.createForMany(recipients, "booking_expired", { campaignId: campaign.id });
        expired += 1;
      }
    }
    return { autoReleased, expired };
  }
}

export { assertUser, requireCampaignRole };
