import crypto from 'node:crypto';
import { BUSINESS_TYPES, INFLUENCER_CATEGORIES, LANGUAGES } from '@plugoh/contracts';
import Razorpay from 'razorpay';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import pRetry, { AbortError } from 'p-retry';
import type { EnvConfig } from '../config/env.js';
import { requireConfig } from '../config/env.js';
import { badRequest } from '../core/errors.js';

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
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
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
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('socket') ||
    message.includes('5xx')
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

export type PaymentMethod = 'card' | 'upi' | 'other';

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
};

export interface PaymentProvider {
  createOrder(input: {
    amount: number;
    currency: 'INR';
    receipt?: string;
    payment_capture?: 0 | 1;
  }): Promise<RazorpayOrder>;
  fetchOrder(orderId: string): Promise<RazorpayOrder>;
  fetchPayment(paymentId: string): Promise<{ id: string; method: PaymentMethod }>;
  capturePayment(paymentId: string, amount: number): Promise<void>;
  refundPayment(paymentId: string, amount: number): Promise<{ id: string }>;
  verifySignature(input: { orderId: string; paymentId: string; signature: string }): boolean;
}

export type GeocodingResult = {
  latitude: number;
  longitude: number;
};

export interface GeocodingProvider {
  geocode(address: string): Promise<GeocodingResult | null>;
}

export type WeatherSummary = {
  temperature_celsius: number;
  condition?: string;
  icon?: string;
  is_daytime?: boolean;
  observed_at?: string;
};

export interface WeatherProvider {
  current(input: { latitude: number; longitude: number }): Promise<WeatherSummary | null>;
}

export class GoogleGeocodingProvider implements GeocodingProvider {
  private readonly apiKey: string;

  constructor(config: EnvConfig) {
    this.apiKey = requireConfig(config.googleMapsGeocodingApiKey, 'GOOGLE_MAPS_GEOCODING_API_KEY');
  }

  async geocode(address: string) {
    const trimmed = address.trim();
    if (!trimmed) return null;

    const params = new URLSearchParams({ address: trimmed, key: this.apiKey });
    const response = await withRetry(() =>
      withTimeout(
        (signal) =>
          fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`, {
            signal,
          }),
        10_000,
      ),
    );
    if (!response.ok) {
      if (response.status >= 500) throw new HttpStatusError(response.status, 'Geocoding failed');
      throw badRequest('GEOCODING_PROVIDER_ERROR', 'Google Geocoding rejected request');
    }

    const payload = (await response.json()) as {
      status?: string;
      results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
      error_message?: string;
    };
    if (payload.status === 'ZERO_RESULTS') return null;
    if (payload.status !== 'OK') {
      throw badRequest(
        'GEOCODING_PROVIDER_ERROR',
        payload.error_message || `Google Geocoding returned ${payload.status || 'an error'}`,
      );
    }

    const location = payload.results?.[0]?.geometry?.location;
    if (
      typeof location?.lat === 'number' &&
      Number.isFinite(location.lat) &&
      typeof location.lng === 'number' &&
      Number.isFinite(location.lng)
    ) {
      return { latitude: location.lat, longitude: location.lng };
    }
    return null;
  }
}

export class GoogleWeatherProvider implements WeatherProvider {
  private readonly apiKey: string;

  constructor(config: EnvConfig) {
    this.apiKey = requireConfig(config.googleMapsWeatherApiKey, 'GOOGLE_MAPS_WEATHER_API_KEY');
  }

  async current(input: { latitude: number; longitude: number }) {
    if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) return null;

    const params = new URLSearchParams({
      key: this.apiKey,
      'location.latitude': String(input.latitude),
      'location.longitude': String(input.longitude),
      unitsSystem: 'METRIC',
      languageCode: 'en',
    });
    const response = await withRetry(() =>
      withTimeout(
        (signal) =>
          fetch(`https://weather.googleapis.com/v1/currentConditions:lookup?${params.toString()}`, {
            signal,
          }),
        10_000,
      ),
    );
    if (!response.ok) {
      if (response.status >= 500) throw new HttpStatusError(response.status, 'Weather failed');
      throw badRequest('WEATHER_PROVIDER_ERROR', 'Google Weather rejected request');
    }

    const payload = (await response.json()) as {
      currentTime?: string;
      isDaytime?: boolean;
      weatherCondition?: {
        iconBaseUri?: string;
        description?: { text?: string };
      };
      temperature?: { degrees?: number };
    };
    const temperature = payload.temperature?.degrees;
    if (typeof temperature !== 'number' || !Number.isFinite(temperature)) return null;

    const result: WeatherSummary = {
      temperature_celsius: temperature,
    };
    const condition = payload.weatherCondition?.description?.text;
    const icon = payload.weatherCondition?.iconBaseUri;
    if (condition) result.condition = condition;
    if (icon) result.icon = icon;
    if (typeof payload.isDaytime === 'boolean') result.is_daytime = payload.isDaytime;
    if (payload.currentTime) result.observed_at = payload.currentTime;
    return result;
  }
}

export class RazorpayProvider implements PaymentProvider {
  private readonly razorpay: any;
  private readonly keySecret: string;

  constructor(config: EnvConfig) {
    this.keySecret = requireConfig(config.razorpayKeySecret, 'RAZORPAY_KEY_SECRET');
    this.razorpay = new Razorpay({
      key_id: requireConfig(config.razorpayKeyId, 'RAZORPAY_KEY_ID'),
      key_secret: this.keySecret,
    });
  }

  async createOrder(input: {
    amount: number;
    currency: 'INR';
    receipt?: string;
    payment_capture?: 0 | 1;
  }) {
    const order: { id: string; amount: number; currency: string } = await withRetry(() =>
      withTimeout(() => this.razorpay.orders.create(input), 10_000),
    );
    return { id: order.id, amount: order.amount, currency: order.currency };
  }

  async fetchOrder(orderId: string) {
    const order: { id: string; amount: number; currency: string } = await withRetry(() =>
      withTimeout(() => this.razorpay.orders.fetch(orderId), 10_000),
    );
    return { id: order.id, amount: order.amount, currency: order.currency };
  }

  async fetchPayment(paymentId: string) {
    const payment: { id: string; method: string } = await withRetry(() =>
      withTimeout(() => this.razorpay.payments.fetch(paymentId), 10_000),
    );
    const method: PaymentMethod =
      payment.method === 'card' || payment.method === 'upi' ? payment.method : 'other';
    return { id: payment.id, method };
  }

  async capturePayment(paymentId: string, amount: number) {
    await withRetry(() =>
      withTimeout(() => this.razorpay.payments.capture(paymentId, amount, 'INR'), 10_000),
    );
  }

  async refundPayment(paymentId: string, amount: number) {
    const refund: { id: string } = await withRetry(() =>
      withTimeout(() => this.razorpay.payments.refund(paymentId, { amount }), 10_000),
    );
    return { id: refund.id };
  }

  verifySignature(input: { orderId: string; paymentId: string; signature: string }) {
    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest('hex');
    if (expected.length !== input.signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
  }
}

export function verifyHmacSha256(input: { body: string; signature: string; secret: string }) {
  const expected = crypto.createHmac('sha256', input.secret).update(input.body).digest('hex');
  if (expected.length !== input.signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
}

export interface EmailProvider {
  sendCallRequest(input: { to: string; subject: string; html: string }): Promise<void>;
}

export class ResendEmailProvider implements EmailProvider {
  private readonly resend: Resend;

  constructor(config: EnvConfig) {
    this.resend = new Resend(requireConfig(config.resendApiKey, 'RESEND_API_KEY'));
  }

  async sendCallRequest(input: { to: string; subject: string; html: string }) {
    await withRetry(() =>
      withTimeout(
        () => this.resend.emails.send({ from: 'Plugoh <noreply@plugoh.app>', ...input }),
        10_000,
      ),
    );
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
      client_id: requireConfig(this.config.instagramClientId, 'INSTAGRAM_CLIENT_ID'),
      redirect_uri: requireConfig(this.config.instagramRedirectUri, 'INSTAGRAM_REDIRECT_URI'),
      scope: input.scopes.join(','),
      response_type: 'code',
      state: input.state,
    });
    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string) {
    const body = new URLSearchParams({
      client_id: requireConfig(this.config.instagramClientId, 'INSTAGRAM_CLIENT_ID'),
      client_secret: requireConfig(this.config.instagramAppSecret, 'INSTAGRAM_APP_SECRET'),
      grant_type: 'authorization_code',
      redirect_uri: requireConfig(this.config.instagramRedirectUri, 'INSTAGRAM_REDIRECT_URI'),
      code,
    });
    const shortRes = await withRetry(() =>
      withTimeout(
        (signal) =>
          fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body, signal }),
        10_000,
      ),
    );
    if (!shortRes.ok) {
      if (shortRes.status >= 500)
        throw new HttpStatusError(shortRes.status, 'Instagram token exchange failed');
      throw badRequest('INSTAGRAM_TOKEN_EXCHANGE_FAILED', 'Instagram token exchange failed');
    }
    const shortToken = (await shortRes.json()) as { access_token: string };
    const longParams = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: requireConfig(this.config.instagramAppSecret, 'INSTAGRAM_APP_SECRET'),
      access_token: shortToken.access_token,
    });
    const longRes = await withRetry(() =>
      withTimeout(
        (signal) =>
          fetch(`https://graph.instagram.com/access_token?${longParams.toString()}`, { signal }),
        10_000,
      ),
    );
    if (!longRes.ok) {
      if (longRes.status >= 500)
        throw new HttpStatusError(longRes.status, 'Instagram long-lived token exchange failed');
      throw badRequest(
        'INSTAGRAM_TOKEN_EXCHANGE_FAILED',
        'Instagram long-lived token exchange failed',
      );
    }
    const longToken = (await longRes.json()) as { access_token: string; expires_in: number };
    return {
      accessToken: longToken.access_token,
      expiresAt: new Date(Date.now() + longToken.expires_in * 1000).toISOString(),
    };
  }

  async fetchProfile(accessToken: string) {
    const fields =
      'id,username,biography,profile_picture_url,followers_count,follows_count,media_count';
    const res = await withRetry(() =>
      withTimeout(
        (signal) =>
          fetch(`https://graph.instagram.com/me?fields=${fields}&access_token=${accessToken}`, {
            signal,
          }),
        10_000,
      ),
    );
    if (!res.ok) {
      if (res.status >= 500)
        throw new HttpStatusError(res.status, 'Instagram profile fetch failed');
      throw badRequest('INSTAGRAM_PROFILE_FETCH_FAILED', 'Instagram profile fetch failed');
    }
    const profile = (await res.json()) as Record<string, unknown>;
    const username = textValue(profile.username);
    return {
      ig_user_id: profile.id,
      username: profile.username,
      biography: profile.biography,
      profile_picture_url: profile.profile_picture_url,
      followers_count: profile.followers_count,
      follows_count: profile.follows_count,
      media_count: profile.media_count,
      instagram_url: username ? `https://instagram.com/${username}` : undefined,
    };
  }

  async fetchMedia(accessToken: string) {
    const fields =
      'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
    const res = await withRetry(() =>
      withTimeout(
        (signal) =>
          fetch(
            `https://graph.instagram.com/me/media?fields=${fields}&limit=100&access_token=${accessToken}`,
            { signal },
          ),
        10_000,
      ),
    );
    if (!res.ok) {
      if (res.status >= 500) throw new HttpStatusError(res.status, 'Instagram media fetch failed');
      throw badRequest('INSTAGRAM_MEDIA_FETCH_FAILED', 'Instagram media fetch failed');
    }
    const payload = (await res.json()) as { data?: Record<string, unknown>[] };
    return (payload.data ?? []).map((item) => ({
      ig_media_id: item.id,
      caption: item.caption,
      media_type: item.media_type,
      media_url: item.media_url,
      thumbnail_url: item.thumbnail_url,
      permalink: item.permalink,
      published_at: item.timestamp,
      like_count: item.like_count,
      comments_count: item.comments_count,
      engagement: Number(item.like_count ?? 0) + Number(item.comments_count ?? 0),
    }));
  }
}

export interface StorageProvider {
  uploadDelivery(input: { path: string; file: File }): Promise<string>;
  uploadMessageAttachment(input: { path: string; file: File }): Promise<string>;
  uploadCampaignCardImage(input: {
    path: string;
    bytes: Uint8Array;
    contentType: 'image/png' | 'image/jpeg';
  }): Promise<{ path: string; publicUrl: string }>;
  signedUrl(path: string, expiresInSeconds: number): Promise<string>;
}

export class SupabaseStorageProvider implements StorageProvider {
  private readonly client;

  constructor(config: EnvConfig) {
    this.client = createClient(
      requireConfig(config.supabaseUrl, 'SUPABASE_URL'),
      requireConfig(config.supabaseServiceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  async uploadDelivery(input: { path: string; file: File }) {
    const { error } = await this.client.storage
      .from('campaign-deliveries')
      .upload(input.path, input.file, {
        contentType: input.file.type,
        upsert: false,
      });
    if (error) throw error;
    return input.path;
  }

  async uploadMessageAttachment(input: { path: string; file: File }) {
    const { error } = await this.client.storage
      .from('campaign-messages')
      .upload(input.path, input.file, {
        contentType: input.file.type,
        upsert: false,
      });
    if (error) throw error;
    return input.path;
  }

  async uploadCampaignCardImage(input: {
    path: string;
    bytes: Uint8Array;
    contentType: 'image/png' | 'image/jpeg';
  }) {
    const bucket = this.client.storage.from('campaign-card-images');
    const { error } = await bucket.upload(input.path, input.bytes, {
      contentType: input.contentType,
      upsert: true,
    });
    if (error) throw error;
    const { data } = bucket.getPublicUrl(input.path);
    return { path: input.path, publicUrl: data.publicUrl };
  }

  async signedUrl(path: string, expiresInSeconds: number) {
    const { data, error } = await this.client.storage
      .from('campaign-deliveries')
      .createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  }
}

export interface AiProvider {
  generateInfluencerProfile(input: {
    profile: Record<string, unknown>;
    media: Record<string, unknown>[];
  }): Promise<Record<string, unknown>>;
  generateBusinessProfile(input: {
    profile: Record<string, unknown>;
  }): Promise<Record<string, unknown>>;
  generateCampaignCreative(input: CampaignCreativeInput): Promise<CampaignCreativeResult>;
}

export type CampaignCreativeInput = {
  campaign: Record<string, unknown>;
  businessProfile?: Record<string, unknown> | null;
  influencerProfile?: Record<string, unknown> | null;
};

export type CampaignCreativeResult = {
  title: string;
  imagePrompt: string;
  imageBytes: Uint8Array;
  imageMimeType: 'image/png' | 'image/jpeg';
};

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

export type PushSendResult = {
  sent: number;
  failed: number;
  errors: string[];
};

export interface PushProvider {
  send(messages: PushMessage[]): Promise<PushSendResult>;
}

export class ExpoPushProvider implements PushProvider {
  async send(messages: PushMessage[]) {
    if (messages.length === 0) {
      return { sent: 0, failed: 0, errors: [] };
    }

    const response = await withRetry(() =>
      withTimeout(
        (signal) =>
          fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            signal,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(messages),
          }),
        10_000,
      ),
    );

    if (!response.ok) {
      if (response.status >= 500)
        throw new HttpStatusError(response.status, 'Expo push send failed');
      throw badRequest('PUSH_PROVIDER_ERROR', 'Push provider rejected request');
    }

    const payload = (await response.json()) as {
      data?: Array<{ status?: string; message?: string }>;
      errors?: Array<{ message?: string }>;
    };
    const ticketErrors = (payload.data ?? [])
      .filter((ticket) => ticket.status === 'error')
      .map((ticket) => ticket.message ?? 'Push ticket returned error');
    const topErrors = (payload.errors ?? []).map((row) => row.message ?? 'Push request failed');
    const errors = [...ticketErrors, ...topErrors];

    return {
      sent: Math.max(0, messages.length - errors.length),
      failed: errors.length,
      errors,
    };
  }
}

export class ExternalAiProvider implements AiProvider {
  constructor(private readonly config: EnvConfig) {}

  async generateInfluencerProfile(input: {
    profile: Record<string, unknown>;
    media: Record<string, unknown>[];
  }) {
    if (this.config.aiProvider === 'anthropic' && this.config.anthropicApiKey) {
      try {
        return await this.generateInfluencerWithAnthropic(input);
      } catch {
        return this.generateInfluencerHeuristic(input);
      }
    }
    return this.generateInfluencerHeuristic(input);
  }

  async generateBusinessProfile(input: { profile: Record<string, unknown> }) {
    if (this.config.aiProvider === 'anthropic' && this.config.anthropicApiKey) {
      try {
        return await this.generateBusinessWithAnthropic(input);
      } catch {
        return this.generateBusinessHeuristic(input);
      }
    }
    return this.generateBusinessHeuristic(input);
  }

  async generateCampaignCreative(input: CampaignCreativeInput) {
    if (this.config.aiProvider !== 'azure_openai') {
      throw badRequest(
        'AI_PROVIDER_UNAVAILABLE',
        'Azure OpenAI campaign creative provider is not configured',
      );
    }
    return this.generateCampaignCreativeWithAzure(input);
  }

  private generateInfluencerHeuristic(input: {
    profile: Record<string, unknown>;
    media: Record<string, unknown>[];
  }) {
    const text = [
      input.profile.biography,
      input.profile.bio,
      ...input.media.map((item) => item.caption),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const followerCount = Number(
      input.profile.followers_count ?? input.profile.follower_count ?? 0,
    );
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
    const biography = textValue(input.profile.biography);
    const brandName = textValue(
      input.profile.brand_name,
      textValue(input.profile.instagram_username, 'Brand'),
    );
    const brandType = textValue(input.profile.brand_category, inferBusinessType(biography));
    const summary = buildBusinessSummary(brandName, brandType, biography);
    return {
      brand_summary: summary,
      tagline: buildBusinessTagline(brandName, brandType),
    };
  }

  private async generateInfluencerWithAnthropic(input: {
    profile: Record<string, unknown>;
    media: Record<string, unknown>[];
  }) {
    const response = await this.callAnthropic(
      [
        'Return strict JSON with keys: category, languages, bio, price_per_reel_paise.',
        `Profile: ${JSON.stringify(input.profile)}`,
        `Media: ${JSON.stringify(input.media.slice(0, 20))}`,
      ].join('\n'),
      60_000,
    );
    const parsed = parseAnthropicJson(response);
    return {
      category: textValue(parsed.category, 'other'),
      languages: Array.isArray(parsed.languages)
        ? parsed.languages.map((item) => String(item))
        : ['English'],
      bio: textValue(parsed.bio),
      price_per_reel_paise: Number(parsed.price_per_reel_paise ?? 150000),
    };
  }

  private async generateBusinessWithAnthropic(input: { profile: Record<string, unknown> }) {
    const response = await this.callAnthropic(
      [
        'Return strict JSON with keys: brand_summary, tagline.',
        `Profile: ${JSON.stringify(input.profile)}`,
      ].join('\n'),
      120_000,
    );
    const parsed = parseAnthropicJson(response);
    return {
      brand_summary: textValue(parsed.brand_summary),
      tagline: textValue(parsed.tagline),
    };
  }

  private async generateCampaignCreativeWithAzure(input: CampaignCreativeInput) {
    const chatJson = await this.callAzureChat(
      [
        'You are the creative director for premium campaign imagery.',
        'Return strict JSON only with keys: title, imagePrompt.',
        'title: 3 to 6 words, Gen Z but polished, memorable, brand-specific, collab/event energy, no hashtags, no emojis, no quotes, max 52 characters.',
        'Avoid generic words like campaign, creator campaign, influencer, booking, package.',
        'imagePrompt: create one full-bleed vertical premium mobile image for the exact campaign, optimized for a tall 9:14 aspect ratio.',
        'The image should represent the brand owner, brand type, package/work being booked, objective, location/date/event if present, and the creator collaboration.',
        'Place one strong hero subject in the upper image area, roughly 18% to 58% from the top, with the lower area kept smooth, quiet, and low-detail.',
        'Frame any character with breathing room: show the full toy-like body or a relaxed waist-up view with head, torso, hands, and surrounding space visible. Avoid extreme close-ups, cropped faces, cropped heads, or characters pressed against the frame edges.',
        'Use playful stylized 3D character art, Memoji-inspired mascots or toy-like creator characters only; never use photorealistic humans, real human portraits, real animals, or documentary photography.',
        'Use a peaceful premium Gen Z aesthetic: happy, calm, modern, soft lighting, gentle depth, one cohesive dominant color palette, minimal supporting props, polished social energy.',
        'The image must be a single continuous scene that fills the entire frame. Avoid inset squares, panels, grids, collage blocks, divided sections, picture frames, borders, split scenes, or multiple separate images.',
        'Avoid pushing too many colors. Avoid clutter, rows of people, brand logos, UI, watermarks, distorted faces, distorted hands, or unsafe content.',
        'Never include text, letters, numbers, signage, captions, labels, logos, UI, or watermark marks anywhere in the image.',
        `Campaign: ${JSON.stringify(input.campaign)}`,
        `Business profile: ${JSON.stringify(input.businessProfile ?? {})}`,
        `Influencer profile: ${JSON.stringify(input.influencerProfile ?? {})}`,
      ].join('\n'),
    );
    const parsed = parseAnthropicJson(chatJson);
    const fallbackTitle = buildCampaignCreativeTitle(input);
    const title = sanitizeCampaignTitle(textValue(parsed.title, fallbackTitle), fallbackTitle);
    const imagePrompt = sanitizeImagePrompt(
      textValue(parsed.imagePrompt, buildCampaignImagePrompt(input, title)),
      input,
      title,
    );
    const imageBytes = await this.callAzureImage(imagePrompt);
    return {
      title,
      imagePrompt,
      imageBytes,
      imageMimeType: 'image/png' as const,
    };
  }

  private async callAzureChat(prompt: string) {
    const endpoint = requireConfig(
      this.config.azureOpenAiEndpoint,
      'AZURE_OPENAI_ENDPOINT',
    ).replace(/\/+$/, '');
    const deployment = requireConfig(
      this.config.azureOpenAiChatDeployment,
      'AZURE_OPENAI_CHAT_DEPLOYMENT',
    );
    const apiKey = requireConfig(this.config.azureOpenAiApiKey, 'AZURE_OPENAI_API_KEY');
    const request =
      endpoint.endsWith('/openai/v1') || endpoint.includes('/openai/v1/')
        ? {
            url: `${endpoint}/chat/completions`,
            headers: {
              authorization: `Bearer ${apiKey}`,
              'content-type': 'application/json',
            },
            body: {
              model: deployment,
              messages: [
                {
                  role: 'system',
                  content: 'You are a precise creative director. Return valid JSON only.',
                },
                { role: 'user', content: prompt },
              ],
              temperature: 0.8,
              max_tokens: 700,
            },
          }
        : {
            url: `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${
              this.config.azureOpenAiApiVersion ?? '2025-04-01-preview'
            }`,
            headers: {
              'api-key': apiKey,
              'content-type': 'application/json',
            },
            body: {
              messages: [
                {
                  role: 'system',
                  content: 'You are a precise creative director. Return valid JSON only.',
                },
                { role: 'user', content: prompt },
              ],
              temperature: 0.8,
              max_tokens: 700,
            },
          };
    const response = await withRetry(() =>
      withTimeout(
        (signal) =>
          fetch(request.url, {
            method: 'POST',
            signal,
            headers: request.headers,
            body: JSON.stringify(request.body),
          }),
        30_000,
      ),
    );
    if (!response.ok) {
      const message = await providerErrorMessage(response, 'Azure OpenAI chat rejected request');
      if (response.status >= 500) throw new HttpStatusError(response.status, message);
      throw badRequest('AI_PROVIDER_ERROR', message);
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return payload.choices?.[0]?.message?.content ?? '{}';
  }

  private async callAzureImage(prompt: string) {
    if (this.config.azureImageProvider === 'mai') {
      return this.callAzureMaiImage(prompt);
    }

    const endpoint = requireConfig(
      this.config.azureOpenAiEndpoint,
      'AZURE_OPENAI_ENDPOINT',
    ).replace(/\/+$/, '');
    const deployment = requireConfig(
      this.config.azureOpenAiImageDeployment,
      'AZURE_OPENAI_IMAGE_DEPLOYMENT',
    );
    const apiKey = requireConfig(this.config.azureOpenAiApiKey, 'AZURE_OPENAI_API_KEY');
    const apiVersion = this.config.azureOpenAiApiVersion ?? '2025-04-01-preview';
    const response = await withRetry(() =>
      withTimeout(
        (signal) =>
          fetch(
            `${endpoint}/openai/deployments/${deployment}/images/generations?api-version=${apiVersion}`,
            {
              method: 'POST',
              signal,
              headers: {
                'api-key': apiKey,
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                prompt,
                n: 1,
                size: this.config.azureOpenAiImageSize ?? '1024x1536',
                quality: this.config.azureOpenAiImageQuality ?? 'medium',
                output_format: 'png',
              }),
            },
          ),
        90_000,
      ),
    );
    if (!response.ok) {
      const message = await providerErrorMessage(
        response,
        'Azure OpenAI image generation rejected request',
      );
      if (response.status >= 500) throw new HttpStatusError(response.status, message);
      throw badRequest('AI_PROVIDER_ERROR', message);
    }
    const payload = (await response.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const image = payload.data?.[0];
    if (image?.b64_json) {
      return Buffer.from(image.b64_json, 'base64');
    }
    if (image?.url) {
      return fetchImageBytes(image.url);
    }
    throw badRequest('AI_PROVIDER_ERROR', 'Azure OpenAI image generation returned no image');
  }

  private async callAzureMaiImage(prompt: string) {
    const endpoint = requireConfig(this.config.azureMaiEndpoint, 'AZURE_MAI_ENDPOINT').replace(
      /\/+$/,
      '',
    );
    const deployment = requireConfig(
      this.config.azureMaiImageDeployment ?? this.config.azureOpenAiImageDeployment,
      'AZURE_MAI_IMAGE_DEPLOYMENT',
    );
    const apiKey = requireConfig(
      this.config.azureMaiApiKey ?? this.config.azureOpenAiApiKey,
      'AZURE_MAI_API_KEY',
    );
    const width = parseMaiDimension(this.config.azureMaiImageWidth, 1024);
    const height = parseMaiDimension(this.config.azureMaiImageHeight, 1024);
    validateMaiDimensions(width, height);

    const response = await withRetry(() =>
      withTimeout(
        (signal) =>
          fetch(`${endpoint}/mai/v1/images/generations`, {
            method: 'POST',
            signal,
            headers: {
              'api-key': apiKey,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: deployment,
              prompt,
              width,
              height,
            }),
          }),
        90_000,
      ),
    );
    if (!response.ok) {
      const message = await providerErrorMessage(
        response,
        'Azure MAI image generation rejected request',
      );
      if (response.status >= 500) throw new HttpStatusError(response.status, message);
      throw badRequest('AI_PROVIDER_ERROR', message);
    }
    const payload = (await response.json()) as {
      data?: Array<{ b64_json?: string }>;
    };
    const b64Json = payload.data?.[0]?.b64_json;
    if (b64Json) {
      return Buffer.from(b64Json, 'base64');
    }
    throw badRequest('AI_PROVIDER_ERROR', 'Azure MAI image generation returned no image');
  }

  private async callAnthropic(prompt: string, timeoutMs: number) {
    const apiKey = requireConfig(this.config.anthropicApiKey, 'ANTHROPIC_API_KEY');
    const response = await withRetry(() =>
      withTimeout(
        (signal) =>
          fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            signal,
            headers: {
              'content-type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-3-5-haiku-latest',
              max_tokens: 1024,
              temperature: 0.2,
              messages: [{ role: 'user', content: prompt }],
            }),
          }),
        timeoutMs,
      ),
    );
    if (!response.ok) {
      if (response.status >= 500)
        throw new HttpStatusError(response.status, 'Anthropic API failed');
      throw badRequest('AI_PROVIDER_ERROR', 'Anthropic API rejected request');
    }
    const payload = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    return payload.content?.find((item) => item.type === 'text')?.text ?? '{}';
  }
}

function parseAnthropicJson(text: string) {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace < 0 || lastBrace <= firstBrace) return {};
  try {
    return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function textValue(value: unknown, fallback = '') {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

function parseMaiDimension(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function validateMaiDimensions(width: number, height: number) {
  if (width < 768 || height < 768 || width * height > 1_048_576) {
    throw badRequest(
      'AI_PROVIDER_ERROR',
      'Azure MAI image dimensions must be at least 768x768 and no more than 1,048,576 total pixels',
    );
  }
}

async function providerErrorMessage(response: Response, fallback: string) {
  const body = await response.text();
  if (!body.trim()) return fallback;
  try {
    const payload = JSON.parse(body) as {
      error?: { message?: string; code?: string };
      message?: string;
    };
    const message = payload.error?.message ?? payload.message;
    if (message) return `${fallback}: ${message}`;
  } catch {
    // Fall through to the trimmed response body.
  }
  return `${fallback}: ${body.trim().slice(0, 500)}`;
}

async function fetchImageBytes(url: string) {
  const response = await withRetry(() => withTimeout((signal) => fetch(url, { signal }), 30_000));
  if (!response.ok) {
    if (response.status >= 500)
      throw new HttpStatusError(response.status, 'Generated image download failed');
    throw badRequest('AI_PROVIDER_ERROR', 'Generated image download failed');
  }
  return Buffer.from(await response.arrayBuffer());
}

function sanitizeCampaignTitle(title: string, fallback: string) {
  const normalized = title.replace(/["#]/g, '').replace(/\s+/g, ' ').trim();
  if (!normalized) return fallback;
  return normalized.length > 52 ? normalized.slice(0, 49).trimEnd() + '...' : normalized;
}

function packageLabel(value: unknown) {
  const raw = textValue(value, 'campaign');
  return raw.replaceAll('_', ' ').replaceAll('+', ' + ');
}

function buildCampaignCreativeTitle(input: CampaignCreativeInput) {
  const brandName = textValue(input.businessProfile?.brand_name, 'Brand');
  const packageName = packageLabel(input.campaign.package_type);
  const influencerName = textValue(
    input.influencerProfile?.display_name,
    textValue(input.influencerProfile?.instagram_username),
  );
  const packageVibe =
    packageName.toLowerCase().includes('reel') || packageName.toLowerCase().includes('video')
      ? 'Reel Drop'
      : packageName.toLowerCase().includes('story')
        ? 'Story Drop'
        : packageName.toLowerCase().includes('post')
          ? 'Post Drop'
          : 'Collab Drop';
  return sanitizeCampaignTitle(
    influencerName
      ? `${brandName} ${packageVibe} with ${influencerName}`
      : `${brandName} ${packageVibe}`,
    'Creator Campaign',
  );
}

function buildCampaignImagePrompt(input: CampaignCreativeInput, title: string) {
  const brandName = textValue(input.businessProfile?.brand_name, 'the brand');
  const brandType = textValue(input.businessProfile?.brand_category, 'lifestyle brand');
  const brandSummary = textValue(input.businessProfile?.brand_summary);
  const tagline = textValue(input.businessProfile?.tagline);
  const location = textValue(
    input.businessProfile?.brand_location,
    textValue(input.influencerProfile?.city),
  );
  const packageName = packageLabel(input.campaign.package_type);
  const objective = textValue(input.campaign.objective, textValue(input.campaign.brief));
  const eventName = textValue(input.campaign.place_name);
  const dueDate = textValue(input.campaign.due_date);
  const influencerName = textValue(
    input.influencerProfile?.display_name,
    textValue(input.influencerProfile?.instagram_username, 'the creator'),
  );
  return [
    'Single full-bleed vertical premium mobile image, tall 9:14 aspect ratio, no UI frame.',
    `Campaign concept: ${brandName}, a ${brandType}, collaborating with ${influencerName} for a ${packageName}.`,
    objective ? `Work/objective cues: ${objective}.` : undefined,
    brandSummary ? `Brand personality: ${brandSummary}.` : undefined,
    tagline ? `Brand tagline mood: ${tagline}.` : undefined,
    eventName ? `Event/place cue: ${eventName}.` : undefined,
    dueDate ? `Timing cue: ${dueDate}.` : undefined,
    location ? `Location flavor: ${location}.` : undefined,
    `Hero placement: create one clear premium hero subject in the upper image area, roughly 18% to 58% from the top, representing the ${packageName} work for ${brandName}.`,
    'Frame any character with breathing room: show the full toy-like body or a relaxed waist-up view with head, torso, hands, and surrounding space visible. Avoid extreme close-ups, cropped faces, cropped heads, or characters pressed against the frame edges.',
    'Keep the lower area smooth, quiet, softly darker or naturally low-detail, with no objects competing for attention.',
    'Character style: playful stylized 3D Memoji-inspired mascot or toy-like creator characters only; no photorealistic humans, no real human portraits, no real animals, no documentary photography.',
    'Visual style: peaceful premium Gen Z, happy and calm, one cohesive dominant color palette, minimal supporting props, gentle depth, soft studio lighting, polished modern social energy.',
    `Mood inspired by the title "${title}": warm, fresh, premium, creator-collab ready.`,
    'Composition must be one continuous scene filling the entire frame; avoid inset squares, panels, grids, collage blocks, divided sections, picture frames, borders, split scenes, or multiple separate images.',
    'Avoid pushing too many colors, clutter, rows of people, brand logos, UI, watermarks, distorted faces, or distorted hands.',
    'Never include text, letters, numbers, signage, captions, labels, logos, UI, or watermark marks anywhere in the image.',
  ]
    .filter(Boolean)
    .join(' ');
}

function sanitizeImagePrompt(prompt: string, input: CampaignCreativeInput, title: string) {
  const normalized = prompt.replace(/\s+/g, ' ').trim();
  const fallback = buildCampaignImagePrompt(input, title);
  const safe = normalized || fallback;
  return safe.length > 1800 ? safe.slice(0, 1800).trimEnd() : safe;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function inferInfluencerCategory(text: string) {
  const categoryMatchers: Record<(typeof INFLUENCER_CATEGORIES)[number], string[]> = {
    food: ['food', 'recipe', 'restaurant', 'cafe', 'meal', 'biryani', 'coffee'],
    fitness: ['fitness', 'gym', 'workout', 'health', 'trainer', 'exercise', 'protein'],
    beauty: ['beauty', 'makeup', 'skincare', 'cosmetic', 'glow', 'haircare'],
    lifestyle: ['lifestyle', 'daily', 'routine', 'self care', 'life update'],
    travel: ['travel', 'trip', 'vacation', 'hotel', 'flight', 'destination'],
    education: ['education', 'study', 'learn', 'tutorial', 'guide', 'career'],
    tech: ['tech', 'software', 'app', 'gadget', 'review', 'ai', 'startup'],
    fashion: ['fashion', 'style', 'outfit', 'lookbook', 'wardrobe'],
    other: [],
  };
  for (const [category, keywords] of Object.entries(categoryMatchers)) {
    if (keywords.some((keyword) => text.includes(keyword))) return category;
  }
  return 'other';
}

function inferLanguages(text: string) {
  const languages: (typeof LANGUAGES)[number][] = [];
  const normalized = text.toLowerCase();
  if (/[ऀ-ॿ]/u.test(text) || /\b(namaste|dhanyavaad|hindi)\b/.test(normalized))
    languages.push('Hindi');
  if (/[ఀ-౿]/u.test(text) || /\b(telugu)\b/.test(normalized)) languages.push('Telugu');
  if (/[஀-௿]/u.test(text) || /\b(tamil)\b/.test(normalized)) languages.push('Tamil');
  if (/[ಀ-೿]/u.test(text) || /\b(kannada)\b/.test(normalized)) languages.push('Kannada');
  if (/[ഀ-ൿ]/u.test(text) || /\b(malayalam)\b/.test(normalized)) languages.push('Malayalam');
  if (languages.length === 0 || /[a-z]/i.test(text)) languages.unshift('English');
  return [...new Set(languages)];
}

function buildInfluencerBio(
  profile: Record<string, unknown>,
  category: string,
  languages: string[],
) {
  const displayName = textValue(
    profile.display_name,
    textValue(profile.instagram_username, 'Creator'),
  );
  const city = textValue(profile.city);
  const location = city ? ` based in ${city}` : '';
  const languageLabel = languages.slice(0, 2).join(' & ');
  return `${displayName}${location} creating ${category.toLowerCase()} content for brands and audiences in ${languageLabel}.`;
}

function estimateInfluencerPricing(followerCount: number, avgEngagement: number) {
  const safeFollowers = Math.max(followerCount, 1000);
  const engagementMultiplier = avgEngagement > 0 ? Math.max(1, avgEngagement / 100) : 1;
  const reel = roundToNearestHundred((safeFollowers * 0.12 + engagementMultiplier * 250) / 10);
  return {
    price_per_reel_paise: Math.max(150000, reel * 100),
  };
}

function roundToNearestHundred(value: number) {
  return Math.round(value / 100) * 100;
}

function inferBusinessType(bio: string) {
  const normalized = bio.toLowerCase();
  const businessMatchers: Record<(typeof BUSINESS_TYPES)[number], string[]> = {
    restaurant_cafe: ['restaurant', 'cafe', 'food', 'dining', 'bistro'],
    d2c_brand: ['brand', 'shop', 'product', 'storefront'],
    local_business: ['local', 'service', 'studio', 'clinic', 'salon'],
    ecommerce: ['e-commerce', 'ecommerce', 'online store', 'shipping'],
    saas_tech: ['software', 'saas', 'tech', 'platform', 'app'],
    agency: ['agency', 'marketing', 'creative'],
    personal_brand: ['coach', 'founder', 'creator', 'consultant'],
    other: [],
  };
  for (const [type, keywords] of Object.entries(businessMatchers)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) return type;
  }
  return 'other';
}

function buildBusinessSummary(brandName: string, brandType: string, bio: string) {
  const baseBio = bio.trim();
  if (baseBio) return `${brandName} is a ${brandType} focused on ${baseBio.replace(/\.$/, '')}.`;
  return `${brandName} is a ${brandType} building a clear, audience-friendly brand presence on Plugoh.`;
}

function buildBusinessTagline(brandName: string, brandType: string) {
  return `${brandName}: standout ${brandType.toLowerCase()} experiences.`;
}
