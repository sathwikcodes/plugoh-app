import crypto from "node:crypto";
import Razorpay from "razorpay";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import type { EnvConfig } from "../config/env.js";
import { requireConfig } from "../config/env.js";
import { badRequest } from "../core/errors.js";

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
    const order = await this.razorpay.orders.create(input);
    return { id: order.id, amount: order.amount, currency: order.currency };
  }

  async fetchOrder(orderId: string) {
    const order = await this.razorpay.orders.fetch(orderId);
    return { id: order.id, amount: order.amount, currency: order.currency };
  }

  async fetchPayment(paymentId: string) {
    const payment = await this.razorpay.payments.fetch(paymentId);
    const method = payment.method === "card" || payment.method === "upi" ? payment.method : "other";
    return { id: payment.id, method };
  }

  async capturePayment(paymentId: string, amount: number) {
    await this.razorpay.payments.capture(paymentId, amount, "INR");
  }

  async refundPayment(paymentId: string, amount: number) {
    const refund = await this.razorpay.payments.refund(paymentId, { amount });
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
    await this.resend.emails.send({ from: "Plugoh <noreply@plugoh.app>", ...input });
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
    const shortRes = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body });
    if (!shortRes.ok) throw badRequest("INSTAGRAM_TOKEN_EXCHANGE_FAILED", "Instagram token exchange failed");
    const shortToken = (await shortRes.json()) as { access_token: string };
    const longParams = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: requireConfig(this.config.instagramAppSecret, "INSTAGRAM_APP_SECRET"),
      access_token: shortToken.access_token,
    });
    const longRes = await fetch(`https://graph.instagram.com/access_token?${longParams.toString()}`);
    if (!longRes.ok) throw badRequest("INSTAGRAM_TOKEN_EXCHANGE_FAILED", "Instagram long-lived token exchange failed");
    const longToken = (await longRes.json()) as { access_token: string; expires_in: number };
    return {
      accessToken: longToken.access_token,
      expiresAt: new Date(Date.now() + longToken.expires_in * 1000).toISOString(),
    };
  }

  async fetchProfile(accessToken: string) {
    const fields = "id,username,biography,profile_picture_url,followers_count,follows_count,media_count";
    const res = await fetch(`https://graph.instagram.com/me?fields=${fields}&access_token=${accessToken}`);
    if (!res.ok) throw badRequest("INSTAGRAM_PROFILE_FETCH_FAILED", "Instagram profile fetch failed");
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
    const res = await fetch(`https://graph.instagram.com/me/media?fields=${fields}&limit=100&access_token=${accessToken}`);
    if (!res.ok) throw badRequest("INSTAGRAM_MEDIA_FETCH_FAILED", "Instagram media fetch failed");
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

  async generateInfluencerProfile() {
    requireConfig(this.config.anthropicApiKey ?? this.config.googleAiKey, "ANTHROPIC_API_KEY or GOOGLE_AI_KEY");
    return {};
  }

  async generateBusinessProfile() {
    requireConfig(this.config.anthropicApiKey ?? this.config.googleAiKey, "ANTHROPIC_API_KEY or GOOGLE_AI_KEY");
    return {};
  }
}
