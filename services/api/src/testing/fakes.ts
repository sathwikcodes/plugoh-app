import crypto from 'node:crypto';
import type {
  AiProvider,
  EmailProvider,
  GeocodingProvider,
  InstagramProvider,
  PaymentProvider,
  PushProvider,
  StorageProvider,
  WeatherProvider,
} from '../clients/providers.js';

export class FakeGeocodingProvider implements GeocodingProvider {
  shouldFail = false;
  calls: string[] = [];

  async geocode(address: string) {
    this.calls.push(address);
    if (this.shouldFail) {
      throw new Error('fake geocoding failure');
    }
    return { latitude: 17.4065, longitude: 78.4772 };
  }
}

export class FakeWeatherProvider implements WeatherProvider {
  calls: Array<{ latitude: number; longitude: number }> = [];

  async current(input: { latitude: number; longitude: number }) {
    this.calls.push(input);
    return {
      temperature_celsius: 22,
      condition: 'Sunny',
      is_daytime: true,
      observed_at: new Date(0).toISOString(),
    };
  }
}

export class FakePaymentProvider implements PaymentProvider {
  keySecret = 'test_secret';
  captures: { paymentId: string; amount: number }[] = [];
  refunds: { paymentId: string; amount: number; id: string }[] = [];

  async createOrder(input: {
    amount: number;
    currency: 'INR';
    receipt?: string;
    payment_capture?: 0 | 1;
  }) {
    return { id: `order_${crypto.randomUUID()}`, amount: input.amount, currency: input.currency };
  }

  async fetchOrder(orderId: string) {
    return {
      id: orderId,
      amount: orderId.includes('small_amount') ? 100 : 11200,
      currency: 'INR',
    };
  }

  async fetchPayment(paymentId: string) {
    return {
      id: paymentId,
      method: paymentId.includes('upi') ? ('upi' as const) : ('card' as const),
    };
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
    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest('hex');
    return input.signature === expected;
  }
}

export class FakeStorageProvider implements StorageProvider {
  campaignImages: Array<{ path: string; contentType: string }> = [];

  async uploadDelivery(input: { path: string; file: File }) {
    return input.path;
  }

  async uploadMessageAttachment(input: { path: string; file: File }) {
    return input.path;
  }

  async uploadCampaignCardImage(input: {
    path: string;
    bytes: Uint8Array;
    contentType: 'image/png' | 'image/jpeg';
  }) {
    this.campaignImages.push({ path: input.path, contentType: input.contentType });
    return { path: input.path, publicUrl: `https://storage.test/${input.path}` };
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
    return {
      accessToken: 'ig_token',
      expiresAt: new Date(Date.now() + 60 * 86400_000).toISOString(),
    };
  }

  async fetchProfile() {
    return { ig_user_id: 'ig_1', username: 'plugoh' };
  }

  async fetchMedia() {
    return [{ ig_media_id: 'media_1', engagement: 10 }];
  }
}

export class FakeAiProvider implements AiProvider {
  shouldFailCampaignCreative = false;

  async generateInfluencerProfile() {
    return { bio: 'Generated bio', category: 'lifestyle', price_per_reel_paise: 1000000 };
  }

  async generateBusinessProfile() {
    return { brand_summary: 'Generated summary', tagline: 'Generated tagline' };
  }

  async generateCampaignCreative() {
    if (this.shouldFailCampaignCreative) {
      throw new Error('fake campaign creative failure');
    }
    return {
      title: 'Aura Weekend Reel',
      imagePrompt: 'Premium campaign invite photo, no text',
      imageBytes: new Uint8Array([137, 80, 78, 71]),
      imageMimeType: 'image/png' as const,
    };
  }
}

export class FakePushProvider implements PushProvider {
  shouldFail = false;
  sent: Array<{ to: string; title: string; body: string; data: Record<string, unknown> }> = [];

  async send(
    messages: Array<{ to: string; title: string; body: string; data: Record<string, unknown> }>,
  ) {
    this.sent.push(...messages);
    if (this.shouldFail) {
      throw new Error('Push provider failure');
    }
    return {
      sent: messages.length,
      failed: 0,
      errors: [],
    };
  }
}
