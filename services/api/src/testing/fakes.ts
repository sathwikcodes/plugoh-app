import crypto from 'node:crypto';
import type {
  AiProvider,
  EmailProvider,
  GeocodingProvider,
  InstagramProvider,
  PaymentProvider,
  PlacesProvider,
  PushProvider,
  StorageProvider,
  WeatherProvider,
} from '../clients/providers.js';

export class FakeGeocodingProvider implements GeocodingProvider {
  shouldFail = false;
  calls: string[] = [];
  reverseCalls: Array<{ latitude: number; longitude: number }> = [];

  async geocode(address: string) {
    this.calls.push(address);
    if (this.shouldFail) {
      throw new Error('fake geocoding failure');
    }
    return { label: address, latitude: 17.4065, longitude: 78.4772 };
  }

  async reverseGeocode(input: { latitude: number; longitude: number }) {
    this.reverseCalls.push(input);
    if (this.shouldFail) {
      throw new Error('fake reverse geocoding failure');
    }
    return { label: 'Jubilee Hills, Hyderabad' };
  }
}

export class FakePlacesProvider implements PlacesProvider {
  shouldFail = false;
  autocompleteCalls: string[] = [];
  detailsCalls: string[] = [];

  async autocomplete(query: string) {
    this.autocompleteCalls.push(query);
    if (this.shouldFail) {
      throw new Error('fake places failure');
    }
    return [
      { place_id: 'place_jubilee', label: 'Jubilee Hills', sublabel: 'Hyderabad, Telangana' },
      { place_id: 'place_banjara', label: 'Banjara Hills', sublabel: 'Hyderabad, Telangana' },
    ];
  }

  async placeDetails(placeId: string) {
    this.detailsCalls.push(placeId);
    if (this.shouldFail) {
      throw new Error('fake place details failure');
    }
    if (placeId === 'place_missing') return null;
    return { label: 'Jubilee Hills, Hyderabad', latitude: 17.4319, longitude: 78.4071 };
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
  orders = new Map<string, { id: string; amount: number; currency: 'INR' }>();

  async createOrder(input: {
    amount: number;
    currency: 'INR';
    receipt?: string;
    payment_capture?: 0 | 1;
  }) {
    const order = {
      id: `order_${crypto.randomUUID()}`,
      amount: input.amount,
      currency: input.currency,
    };
    this.orders.set(order.id, order);
    return order;
  }

  async fetchOrder(orderId: string) {
    const order = this.orders.get(orderId);
    if (order) return order;
    return {
      id: orderId,
      amount: orderId.includes('small_amount') ? 100 : 11200,
      currency: 'INR',
    };
  }

  async fetchPayment(paymentId: string) {
    const method = paymentId.includes('upi') ? ('upi' as const) : ('card' as const);
    return {
      id: paymentId,
      method,
      ...(method === 'card'
        ? {
            card_id: 'card_test_4242',
            card: {
              id: 'card_test_4242',
              last4: '4242',
              network: 'Visa',
              type: 'credit',
              issuer: 'HDFC Bank',
            },
          }
        : {}),
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
      title: 'Aura Reel',
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
