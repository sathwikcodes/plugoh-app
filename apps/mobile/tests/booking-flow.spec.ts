import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  createBookingOrder: vi.fn(),
  verifyBookingPayment: vi.fn(),
}));

const razorpayMock = vi.hoisted(() => ({
  openRazorpayCheckout: vi.fn(),
}));

const storageMock = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    set: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    getString: vi.fn((key: string) => values.get(key)),
    delete: vi.fn((key: string) => {
      values.delete(key);
    }),
  };
});

vi.mock('@/lib/api/endpoints', () => ({
  createBookingOrder: apiMock.createBookingOrder,
  verifyBookingPayment: apiMock.verifyBookingPayment,
}));

vi.mock('@/lib/payments/razorpay', () => ({
  openRazorpayCheckout: razorpayMock.openRazorpayCheckout,
}));

vi.mock('react-native-mmkv', () => ({
  MMKV: class {
    set = storageMock.set;
    getString = storageMock.getString;
    delete = storageMock.delete;
  },
}));

vi.mock('expo-secure-store', () => ({
  setItemAsync: vi.fn((key: string, value: string) => {
    storageMock.values.set(key, value);
  }),
  getItemAsync: vi.fn((key: string) => storageMock.values.get(key) ?? null),
  deleteItemAsync: vi.fn((key: string) => {
    storageMock.values.delete(key);
  }),
}));

const bookingInput = {
  influencer_profile_id: '33333333-3333-4333-8333-333333333333',
  package_type: 'instagram_reel' as const,
  objective: 'feature_product' as const,
  timing_mode: 'asap' as const,
  contact_email: 'brand@test.dev',
  contact_phone: '+919999999999',
};

type PendingBookingVerifyFixture = {
  payload: Record<string, unknown>;
};

describe('booking payment flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMock.values.clear();
    apiMock.createBookingOrder.mockResolvedValue({
      bookingIntentId: '44444444-4444-4444-8444-444444444444',
      orderId: 'order_booking',
      keyId: 'rzp_test_public',
      amount: 3360,
      currency: 'INR',
      price_offered_paise: 3000,
      platform_fee_paise: 360,
      total_charged_paise: 3360,
    });
    razorpayMock.openRazorpayCheckout.mockResolvedValue({
      razorpay_order_id: 'order_booking',
      razorpay_payment_id: 'pay_card',
      razorpay_signature: 'sig',
    });
    apiMock.verifyBookingPayment.mockResolvedValue({
      success: true,
      campaignId: '55555555-5555-4555-8555-555555555555',
    });
  });

  it('creates booking orders with business contact fields and verifies by intent id', async () => {
    const { runBookingPaymentFlow } = await import('@/lib/payments/booking-flow');

    await expect(runBookingPaymentFlow(bookingInput)).resolves.toMatchObject({
      campaignId: '55555555-5555-4555-8555-555555555555',
    });

    expect(apiMock.createBookingOrder).toHaveBeenCalledWith(
      {
        influencer_profile_id: bookingInput.influencer_profile_id,
        package_type: 'instagram_reel',
        objective: 'feature_product',
        timing_mode: 'asap',
        due_date: undefined,
        place_name: undefined,
        business_contact_email: 'brand@test.dev',
        business_contact_phone: '+919999999999',
      },
      expect.stringMatching(/^booking-order-/),
    );
    expect(razorpayMock.openRazorpayCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 'order_booking',
        amount: '3360',
      }),
    );
    expect(razorpayMock.openRazorpayCheckout.mock.calls[0]?.[0]).not.toHaveProperty('method');
    expect(apiMock.verifyBookingPayment).toHaveBeenCalledWith(
      {
        booking_intent_id: '44444444-4444-4444-8444-444444444444',
        razorpay_order_id: 'order_booking',
        razorpay_payment_id: 'pay_card',
        razorpay_signature: 'sig',
      },
      expect.stringMatching(/^booking-verify-/),
    );
    expect(storageMock.values.has('pending-booking-verify')).toBe(false);
  });

  it('surfaces Razorpay test-card failure descriptions from checkout', async () => {
    const { runBookingPaymentFlow } = await import('@/lib/payments/booking-flow');
    razorpayMock.openRazorpayCheckout.mockRejectedValueOnce({
      code: 'BAD_REQUEST_ERROR',
      description: 'Your card was declined in test mode.',
    });

    await expect(runBookingPaymentFlow(bookingInput)).rejects.toThrow(
      'Your card was declined in test mode.',
    );

    expect(apiMock.verifyBookingPayment).not.toHaveBeenCalled();
    expect(storageMock.values.has('pending-booking-verify')).toBe(false);
  });

  it('keeps the paid verification payload pending when API verification fails', async () => {
    const { runBookingPaymentFlow } = await import('@/lib/payments/booking-flow');
    apiMock.verifyBookingPayment.mockRejectedValueOnce(new Error('Network unavailable'));

    await expect(runBookingPaymentFlow(bookingInput)).rejects.toThrow('Network unavailable');

    const pending = JSON.parse(
      storageMock.values.get('pending-booking-verify') ?? '{}',
    ) as PendingBookingVerifyFixture;
    expect(pending.payload).toMatchObject({
      booking_intent_id: '44444444-4444-4444-8444-444444444444',
      razorpay_order_id: 'order_booking',
      razorpay_payment_id: 'pay_card',
      razorpay_signature: 'sig',
    });
  });

  it('falls back to legacy booking verification when the API cannot create a durable intent', async () => {
    const { runBookingPaymentFlow } = await import('@/lib/payments/booking-flow');
    apiMock.createBookingOrder.mockResolvedValueOnce({
      orderId: 'order_legacy_booking',
      keyId: 'rzp_test_public',
      amount: 3360,
      currency: 'INR',
      price_offered_paise: 3000,
      platform_fee_paise: 360,
      total_charged_paise: 3360,
    });
    razorpayMock.openRazorpayCheckout.mockResolvedValueOnce({
      razorpay_order_id: 'order_legacy_booking',
      razorpay_payment_id: 'pay_card',
      razorpay_signature: 'sig',
    });

    await expect(runBookingPaymentFlow(bookingInput)).resolves.toMatchObject({
      campaignId: '55555555-5555-4555-8555-555555555555',
    });

    expect(apiMock.verifyBookingPayment).toHaveBeenCalledWith(
      {
        influencer_profile_id: bookingInput.influencer_profile_id,
        package_type: 'instagram_reel',
        objective: 'feature_product',
        timing_mode: 'asap',
        due_date: undefined,
        place_name: undefined,
        business_contact_email: 'brand@test.dev',
        business_contact_phone: '+919999999999',
        razorpay_order_id: 'order_legacy_booking',
        razorpay_payment_id: 'pay_card',
        razorpay_signature: 'sig',
      },
      expect.stringMatching(/^booking-verify-/),
    );
  });

  it('recovers a pending paid verification and clears it after success', async () => {
    const { recoverPendingBookingVerify } = await import('@/lib/payments/booking-flow');
    storageMock.values.set(
      'pending-booking-verify',
      JSON.stringify({
        idempotencyKey: 'booking-retry',
        payload: {
          booking_intent_id: '44444444-4444-4444-8444-444444444444',
          razorpay_order_id: 'order_booking',
          razorpay_payment_id: 'pay_card',
          razorpay_signature: 'sig',
        },
        createdAt: Date.now(),
      }),
    );

    await expect(recoverPendingBookingVerify()).resolves.toMatchObject({
      campaignId: '55555555-5555-4555-8555-555555555555',
    });

    expect(apiMock.verifyBookingPayment).toHaveBeenCalledWith(
      {
        booking_intent_id: '44444444-4444-4444-8444-444444444444',
        razorpay_order_id: 'order_booking',
        razorpay_payment_id: 'pay_card',
        razorpay_signature: 'sig',
      },
      'booking-retry',
    );
    expect(storageMock.values.has('pending-booking-verify')).toBe(false);
  });
});
