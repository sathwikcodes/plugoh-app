import crypto from "node:crypto";
import type { AiProvider, EmailProvider, InstagramProvider, PaymentProvider, StorageProvider } from "../clients/providers.js";

export class FakePaymentProvider implements PaymentProvider {
  keySecret = "test_secret";

  async createOrder(input: { amount: number; currency: "INR"; receipt?: string; payment_capture?: 0 | 1 }) {
    return { id: `order_${crypto.randomUUID()}`, amount: input.amount, currency: input.currency };
  }

  async fetchOrder(orderId: string) {
    return { id: orderId, amount: 1120000, currency: "INR" };
  }

  async fetchPayment(paymentId: string) {
    return { id: paymentId, method: paymentId.includes("upi") ? "upi" as const : "card" as const };
  }

  async capturePayment() {}

  async refundPayment() {
    return { id: `refund_${crypto.randomUUID()}` };
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
