import crypto from "node:crypto";
import { BUSINESS_TYPES, INFLUENCER_CATEGORIES, LANGUAGES } from "@plugoh/contracts";
import Razorpay from "razorpay";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import pRetry, { AbortError } from "p-retry";
import type { EnvConfig } from "../config/env.js";
import { requireConfig } from "../config/env.js";
import { badRequest } from "../core/errors.js";

class HttpStatusError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await run(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`TIMEOUT_${timeoutMs}MS`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function shouldRetry(error: unknown) {
  if (error instanceof AbortError) return false;
  if (error instanceof HttpStatusError) return error.status >= 500;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("network") ||
    message.includes("econnreset") ||
    message.includes("socket") ||
    message.includes("5xx")
  );
}

async function withRetry<T>(run: () => Promise<T>) {
  return pRetry(run, {
    retries: 3,
    factor: 2,
    minTimeout: 200,
    onFailedAttempt(error) {
      if (!shouldRetry(error)) {
        throw new AbortError(String(error));
      }
    },
  });
}

export type PaymentMethod = "card" | "upi" | "other";

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
};

export interface PaymentProvider {
  createOrder(input: { amount: number; currency: "INR"; receipt?: string; payment_capture?: 0 | 1 }): Promise<RazorpayOrder>;
  fetchOrder(orderId: string): Promise<RazorpayOrder>;
  fetchPayment(paymentId: string): Promise<{ id: string; method: PaymentMethod }>;
  capturePayment(paymentId: string, amount: number): Promise<void>;
  refundPayment(paymentId: string, amount: number): Promise<{ id: string }>;
  verifySignature(input: { orderId: string; paymentId: string; signature: string }): boolean;
}

export class RazorpayProvider implements PaymentProvider {
  private readonly razorpay: any;
  private readonly keySecret: string;

  constructor(config: EnvConfig) {
    this.keySecret = requireConfig(config.razorpayKeySecret, "RAZORPAY_KEY_SECRET");
    this.razorpay = new Razorpay({
      key_id: requireConfig(config.razorpayKeyId, "RAZORPAY_KEY_ID"),
      key_secret: this.keySecret,
    });
  }

  async createOrder(input: { amount: number; currency: "INR"; receipt?: string; payment_capture?: 0 | 1 }) {
    const order = (await withRetry(() => withTimeout(() => this.razorpay.orders.create(input), 10_000))) as {
      id: string;
      amount: number;
      currency: string;
    };
    return { id: order.id, amount: order.amount, currency: order.currency };
  }

  async fetchOrder(orderId: string) {
    const order = (await withRetry(() => withTimeout(() => this.razorpay.orders.fetch(orderId), 10_000))) as {
      id: string;
      amount: number;
      currency: string;
    };
    return { id: order.id, amount: order.amount, currency: order.currency };
  }

  async fetchPayment(paymentId: string) {
    const payment = (await withRetry(() => withTimeout(() => this.razorpay.payments.fetch(paymentId), 10_000))) as {
      id: string;
      method: string;
    };
    const method: PaymentMethod = payment.method === "card" || payment.method === "upi" ? payment.method : "other";
    return { id: payment.id, method };
  }

  async capturePayment(paymentId: string, amount: number) {
    await withRetry(() => withTimeout(() => this.razorpay.payments.capture(paymentId, amount, "INR"), 10_000));
  }

  async refundPayment(paymentId: string, amount: number) {
    const refund = (await withRetry(() =>
      withTimeout(() => this.razorpay.payments.refund(paymentId, { amount }), 10_000),
    )) as { id: string };
    return { id: refund.id };
  }

  verifySignature(input: { orderId: string; paymentId: string; signature: string }) {
    const expected = crypto
      .createHmac("sha256", this.keySecret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest("hex");
    if (expected.length !== input.signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
  }
}

export function verifyHmacSha256(input: { body: string; signature: string; secret: string }) {
  const expected = crypto.createHmac("sha256", input.secret).update(input.body).digest("hex");
  if (expected.length !== input.signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
}

export interface EmailProvider {
  sendCallRequest(input: { to: string; subject: string; html: string }): Promise<void>;
}

export class ResendEmailProvider implements EmailProvider {
  private readonly resend: Resend;

  constructor(config: EnvConfig) {
    this.resend = new Resend(requireConfig(config.resendApiKey, "RESEND_API_KEY"));
  }

  async sendCallRequest(input: { to: string; subject: string; html: string }) {
    await withRetry(() => withTimeout(() => this.resend.emails.send({ from: "Plugoh <noreply@plugoh.app>", ...input }), 10_000));
  }
}

export interface InstagramProvider {
  buildOAuthUrl(input: { state: string; scopes: string[] }): string;
  exchangeCode(code: string): Promise<{ accessToken: string; expiresAt: string }>;
  fetchProfile(accessToken: string): Promise<Record<string, unknown>>;
  fetchMedia(accessToken: string): Promise<Record<string, unknown>[]>;
}

export class MetaInstagramProvider implements InstagramProvider {
  constructor(private readonly config: EnvConfig) {}

  buildOAuthUrl(input: { state: string; scopes: string[] }) {
    const params = new URLSearchParams({
      client_id: requireConfig(this.config.instagramClientId, "INSTAGRAM_CLIENT_ID"),
      redirect_uri: requireConfig(this.config.instagramRedirectUri, "INSTAGRAM_REDIRECT_URI"),
      scope: input.scopes.join(","),
      response_type: "code",
      state: input.state,
    });
    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string) {
    const body = new URLSearchParams({
      client_id: requireConfig(this.config.instagramClientId, "INSTAGRAM_CLIENT_ID"),
      client_secret: requireConfig(this.config.instagramAppSecret, "INSTAGRAM_APP_SECRET"),
      grant_type: "authorization_code",
      redirect_uri: requireConfig(this.config.instagramRedirectUri, "INSTAGRAM_REDIRECT_URI"),
      code,
    });
    const shortRes = await withRetry(() =>
      withTimeout((signal) => fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body, signal }), 10_000),
    );
    if (!shortRes.ok) {
      if (shortRes.status >= 500) throw new HttpStatusError(shortRes.status, "Instagram token exchange failed");
      throw badRequest("INSTAGRAM_TOKEN_EXCHANGE_FAILED", "Instagram token exchange failed");
    }
    const shortToken = (await shortRes.json()) as { access_token: string };
    const longParams = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: requireConfig(this.config.instagramAppSecret, "INSTAGRAM_APP_SECRET"),
      access_token: shortToken.access_token,
    });
    const longRes = await withRetry(() =>
      withTimeout((signal) => fetch(`https://graph.instagram.com/access_token?${longParams.toString()}`, { signal }), 10_000),
    );
    if (!longRes.ok) {
      if (longRes.status >= 500) throw new HttpStatusError(longRes.status, "Instagram long-lived token exchange failed");
      throw badRequest("INSTAGRAM_TOKEN_EXCHANGE_FAILED", "Instagram long-lived token exchange failed");
    }
    const longToken = (await longRes.json()) as { access_token: string; expires_in: number };
    return {
      accessToken: longToken.access_token,
      expiresAt: new Date(Date.now() + longToken.expires_in * 1000).toISOString(),
    };
  }

  async fetchProfile(accessToken: string) {
    const fields = "id,username,biography,profile_picture_url,followers_count,follows_count,media_count";
    const res = await withRetry(() =>
      withTimeout((signal) => fetch(`https://graph.instagram.com/me?fields=${fields}&access_token=${accessToken}`, { signal }), 10_000),
    );
    if (!res.ok) {
      if (res.status >= 500) throw new HttpStatusError(res.status, "Instagram profile fetch failed");
      throw badRequest("INSTAGRAM_PROFILE_FETCH_FAILED", "Instagram profile fetch failed");
    }
    const profile = (await res.json()) as Record<string, unknown>;
    return {
      ig_user_id: profile.id,
      ig_username: profile.username,
      ig_biography: profile.biography,
      ig_profile_picture_url: profile.profile_picture_url,
      ig_followers_count: profile.followers_count,
      ig_follows_count: profile.follows_count,
      ig_media_count: profile.media_count,
      instagram_url: profile.username ? `https://instagram.com/${profile.username}` : undefined,
    };
  }

  async fetchMedia(accessToken: string) {
    const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";
    const res = await withRetry(() =>
      withTimeout((signal) => fetch(`https://graph.instagram.com/me/media?fields=${fields}&limit=100&access_token=${accessToken}`, { signal }), 10_000),
    );
    if (!res.ok) {
      if (res.status >= 500) throw new HttpStatusError(res.status, "Instagram media fetch failed");
      throw badRequest("INSTAGRAM_MEDIA_FETCH_FAILED", "Instagram media fetch failed");
    }
    const payload = (await res.json()) as { data?: Record<string, unknown>[] };
    return (payload.data ?? []).map((item) => ({
      ig_media_id: item.id,
      caption: item.caption,
      media_type: item.media_type,
      media_url: item.media_url,
      thumbnail_url: item.thumbnail_url,
      permalink: item.permalink,
      timestamp: item.timestamp,
      like_count: item.like_count,
      comments_count: item.comments_count,
      engagement: Number(item.like_count ?? 0) + Number(item.comments_count ?? 0),
    }));
  }
}

export interface StorageProvider {
  uploadDelivery(input: { path: string; file: File }): Promise<string>;
  signedUrl(path: string, expiresInSeconds: number): Promise<string>;
}

export class SupabaseStorageProvider implements StorageProvider {
  private readonly client;

  constructor(config: EnvConfig) {
    this.client = createClient(
      requireConfig(config.supabaseUrl, "SUPABASE_URL"),
      requireConfig(config.supabaseServiceRoleKey, "SUPABASE_SERVICE_ROLE_KEY"),
    );
  }

  async uploadDelivery(input: { path: string; file: File }) {
    const { error } = await this.client.storage.from("campaign-deliveries").upload(input.path, input.file, {
      contentType: input.file.type,
      upsert: false,
    });
    if (error) throw error;
    return input.path;
  }

  async signedUrl(path: string, expiresInSeconds: number) {
    const { data, error } = await this.client.storage.from("campaign-deliveries").createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  }
}

export interface AiProvider {
  generateInfluencerProfile(input: { profile: Record<string, unknown>; media: Record<string, unknown>[] }): Promise<Record<string, unknown>>;
  generateBusinessProfile(input: { profile: Record<string, unknown> }): Promise<Record<string, unknown>>;
}

export class ExternalAiProvider implements AiProvider {
  constructor(private readonly config: EnvConfig) {}

  async generateInfluencerProfile(input: { profile: Record<string, unknown>; media: Record<string, unknown>[] }) {
    if (this.config.aiProvider === "anthropic" && this.config.anthropicApiKey) {
      try {
        return await this.generateInfluencerWithAnthropic(input);
      } catch {
        return this.generateInfluencerHeuristic(input);
      }
    }
    return this.generateInfluencerHeuristic(input);
  }

  async generateBusinessProfile(input: { profile: Record<string, unknown> }) {
    if (this.config.aiProvider === "anthropic" && this.config.anthropicApiKey) {
      try {
        return await this.generateBusinessWithAnthropic(input);
      } catch {
        return this.generateBusinessHeuristic(input);
      }
    }
    return this.generateBusinessHeuristic(input);
  }

  private generateInfluencerHeuristic(input: { profile: Record<string, unknown>; media: Record<string, unknown>[] }) {
    const text = [input.profile.ig_biography, input.profile.bio, ...input.media.map((item) => item.caption)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const followerCount = Number(input.profile.ig_followers_count ?? input.profile.follower_count ?? 0);
    const avgEngagement = average(input.media.map((item) => Number(item.engagement ?? 0)));
    const category = inferInfluencerCategory(text);
    const languages = inferLanguages(text);
    const bio = buildInfluencerBio(input.profile, category, languages);
    const pricing = estimateInfluencerPricing(followerCount, avgEngagement);
    return {
      category,
      languages,
      bio,
      ...pricing,
    };
  }

  private generateBusinessHeuristic(input: { profile: Record<string, unknown> }) {
    const brandName = String(input.profile.brand_name ?? input.profile.ig_username ?? "Brand").trim();
    const brandType = String(input.profile.brand_type ?? inferBusinessType(String(input.profile.ig_biography ?? ""))).trim();
    const summary = buildBusinessSummary(brandName, brandType, String(input.profile.ig_biography ?? ""));
    return {
      brand_summary: summary,
      tagline: buildBusinessTagline(brandName, brandType),
    };
  }

  private async generateInfluencerWithAnthropic(input: { profile: Record<string, unknown>; media: Record<string, unknown>[] }) {
    const response = await this.callAnthropic(
      [
        "Return strict JSON with keys: category, languages, bio, price_per_reel, price_per_post, price_per_story.",
        `Profile: ${JSON.stringify(input.profile)}`,
        `Media: ${JSON.stringify(input.media.slice(0, 20))}`,
      ].join("\n"),
      60_000,
    );
    const parsed = parseAnthropicJson(response);
    return {
      category: String(parsed.category ?? "Other"),
      languages: Array.isArray(parsed.languages) ? parsed.languages.map((item) => String(item)) : ["English"],
      bio: String(parsed.bio ?? ""),
      price_per_reel: Number(parsed.price_per_reel ?? 1500),
      price_per_post: Number(parsed.price_per_post ?? 1000),
      price_per_story: Number(parsed.price_per_story ?? 500),
    };
  }

  private async generateBusinessWithAnthropic(input: { profile: Record<string, unknown> }) {
    const response = await this.callAnthropic(
      [
        "Return strict JSON with keys: brand_summary, tagline.",
        `Profile: ${JSON.stringify(input.profile)}`,
      ].join("\n"),
      120_000,
    );
    const parsed = parseAnthropicJson(response);
    return {
      brand_summary: String(parsed.brand_summary ?? ""),
      tagline: String(parsed.tagline ?? ""),
    };
  }

  private async callAnthropic(prompt: string, timeoutMs: number) {
    const apiKey = requireConfig(this.config.anthropicApiKey, "ANTHROPIC_API_KEY");
    const response = await withRetry(() =>
      withTimeout(
        (signal) =>
          fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            signal,
            headers: {
              "content-type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-3-5-haiku-latest",
              max_tokens: 1024,
              temperature: 0.2,
              messages: [{ role: "user", content: prompt }],
            }),
          }),
        timeoutMs,
      ),
    );
    if (!response.ok) {
      if (response.status >= 500) throw new HttpStatusError(response.status, "Anthropic API failed");
      throw badRequest("AI_PROVIDER_ERROR", "Anthropic API rejected request");
    }
    const payload = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    return payload.content?.find((item) => item.type === "text")?.text ?? "{}";
  }
}

function parseAnthropicJson(text: string) {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace < 0 || lastBrace <= firstBrace) return {};
  try {
    return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function inferInfluencerCategory(text: string) {
  const categoryMatchers: Record<(typeof INFLUENCER_CATEGORIES)[number], string[]> = {
    Food: ["food", "recipe", "restaurant", "cafe", "meal", "biryani", "coffee"],
    Fitness: ["fitness", "gym", "workout", "health", "trainer", "exercise", "protein"],
    Beauty: ["beauty", "makeup", "skincare", "cosmetic", "glow", "haircare"],
    Lifestyle: ["lifestyle", "daily", "routine", "self care", "life update"],
    Travel: ["travel", "trip", "vacation", "hotel", "flight", "destination"],
    Education: ["education", "study", "learn", "tutorial", "guide", "career"],
    Tech: ["tech", "software", "app", "gadget", "review", "ai", "startup"],
    Fashion: ["fashion", "style", "outfit", "lookbook", "wardrobe"],
    Other: [],
  };
  for (const [category, keywords] of Object.entries(categoryMatchers)) {
    if (keywords.some((keyword) => text.includes(keyword))) return category;
  }
  return "Other";
}

function inferLanguages(text: string) {
  const languages: (typeof LANGUAGES)[number][] = [];
  const normalized = text.toLowerCase();
  if (/[ऀ-ॿ]/u.test(text) || /\b(namaste|dhanyavaad|hindi)\b/.test(normalized)) languages.push("Hindi");
  if (/[ఀ-౿]/u.test(text) || /\b(telugu)\b/.test(normalized)) languages.push("Telugu");
  if (/[஀-௿]/u.test(text) || /\b(tamil)\b/.test(normalized)) languages.push("Tamil");
  if (/[ಀ-೿]/u.test(text) || /\b(kannada)\b/.test(normalized)) languages.push("Kannada");
  if (/[ഀ-ൿ]/u.test(text) || /\b(malayalam)\b/.test(normalized)) languages.push("Malayalam");
  if (languages.length === 0 || /[a-z]/i.test(text)) languages.unshift("English");
  return [...new Set(languages)];
}

function buildInfluencerBio(profile: Record<string, unknown>, category: string, languages: string[]) {
  const displayName = String(profile.display_name ?? profile.ig_username ?? "Creator").trim();
  const city = String(profile.city ?? "").trim();
  const location = city ? ` based in ${city}` : "";
  const languageLabel = languages.slice(0, 2).join(" & ");
  return `${displayName}${location} creating ${category.toLowerCase()} content for brands and audiences in ${languageLabel}.`;
}

function estimateInfluencerPricing(followerCount: number, avgEngagement: number) {
  const safeFollowers = Math.max(followerCount, 1000);
  const engagementMultiplier = avgEngagement > 0 ? Math.max(1, avgEngagement / 100) : 1;
  const reel = roundToNearestHundred((safeFollowers * 0.12 + engagementMultiplier * 250) / 10);
  return {
    price_per_reel: Math.max(1500, reel),
    price_per_post: Math.max(1000, roundToNearestHundred(reel * 0.75)),
    price_per_story: Math.max(500, roundToNearestHundred(reel * 0.35)),
  };
}

function roundToNearestHundred(value: number) {
  return Math.round(value / 100) * 100;
}

function inferBusinessType(bio: string) {
  const normalized = bio.toLowerCase();
  const businessMatchers: Record<(typeof BUSINESS_TYPES)[number], string[]> = {
    "Restaurant/Cafe": ["restaurant", "cafe", "food", "dining", "bistro"],
    "D2C Brand": ["brand", "shop", "product", "storefront"],
    "Local Business": ["local", "service", "studio", "clinic", "salon"],
    "E-commerce": ["e-commerce", "ecommerce", "online store", "shipping"],
    "SaaS/Tech": ["software", "saas", "tech", "platform", "app"],
    Agency: ["agency", "marketing", "creative"],
    "Personal Brand": ["coach", "founder", "creator", "consultant"],
    Other: [],
  };
  for (const [type, keywords] of Object.entries(businessMatchers)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) return type;
  }
  return "Other";
}

function buildBusinessSummary(brandName: string, brandType: string, bio: string) {
  const baseBio = bio.trim();
  if (baseBio) return `${brandName} is a ${brandType} focused on ${baseBio.replace(/\.$/, "")}.`;
  return `${brandName} is a ${brandType} building a clear, audience-friendly brand presence on Plugoh.`;
}

function buildBusinessTagline(brandName: string, brandType: string) {
  return `${brandName}: standout ${brandType.toLowerCase()} experiences.`;
}
