import crypto from "node:crypto";
import type { AiProvider, EmailProvider, InstagramProvider, PaymentProvider, PushProvider, StorageProvider } from "../clients/providers.js";

export class FakePaymentProvider implements PaymentProvider {
  keySecret = "test_secret";
  captures: { paymentId: string; amount: number }[] = [];
  refunds: { paymentId: string; amount: number; id: string }[] = [];

  async createOrder(input: { amount: number; currency: "INR"; receipt?: string; payment_capture?: 0 | 1 }) {
    return { id: `order_${crypto.randomUUID()}`, amount: input.amount, currency: input.currency };
  }

  async fetchOrder(orderId: string) {
    return { id: orderId, amount: 1120000, currency: "INR" };
  }

  async fetchPayment(paymentId: string) {
    return { id: paymentId, method: paymentId.includes("upi") ? "upi" as const : "card" as const };
  }

  async capturePayment(paymentId: string, amount: number) {
    this.captures.push({ paymentId, amount });
  }

  async refundPayment(paymentId: string, amount: number) {
    const id = `refund_${crypto.randomUUID()}`;
    this.refunds.push({ paymentId, amount, id });
    return { id };
  }

  verifySignature(input: { orderId: string; paymentId: string; signature: string }) {
    const expected = crypto.createHmac("sha256", this.keySecret).update(`${input.orderId}|${input.paymentId}`).digest("hex");
    return input.signature === expected;
  }
}

export class FakeStorageProvider implements StorageProvider {
  async uploadDelivery(input: { path: string; file: File }) {
    return input.path;
  }

  async uploadMessageAttachment(input: { path: string; file: File }) {
    return input.path;
  }

  async signedUrl(path: string) {
    return `https://storage.test/${path}`;
  }
}

export class FakeEmailProvider implements EmailProvider {
  sent: unknown[] = [];
  async sendCallRequest(input: { to: string; subject: string; html: string }) {
    this.sent.push(input);
  }
}

export class FakeInstagramProvider implements InstagramProvider {
  buildOAuthUrl(input: { state: string }) {
    return `https://instagram.test/oauth?state=${input.state}`;
  }

  async exchangeCode() {
    return { accessToken: "ig_token", expiresAt: new Date(Date.now() + 60 * 86400_000).toISOString() };
  }

  async fetchProfile() {
    return { ig_user_id: "ig_1", ig_username: "plugoh" };
  }

  async fetchMedia() {
    return [{ ig_media_id: "media_1", engagement: 10 }];
  }
}

export class FakeAiProvider implements AiProvider {
  async generateInfluencerProfile() {
    return { bio: "Generated bio", category: "Lifestyle", price_per_reel: 10000 };
  }

  async generateBusinessProfile() {
    return { brand_summary: "Generated summary", tagline: "Generated tagline" };
  }
}

export class FakePushProvider implements PushProvider {
  shouldFail = false;
  sent: Array<{ to: string; title: string; body: string; data: Record<string, unknown> }> = [];

  async send(messages: Array<{ to: string; title: string; body: string; data: Record<string, unknown> }>) {
    this.sent.push(...messages);
    if (this.shouldFail) {
      throw new Error("Push provider failure");
    }
    return {
      sent: messages.length,
      failed: 0,
      errors: [],
    };
  }
}
