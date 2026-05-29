import { createBookingOrder, verifyBookingPayment } from '@/lib/api/endpoints';
import {
  clearPendingBookingVerify,
  getPendingBookingVerify,
  setPendingBookingVerify,
} from '@/lib/payments/escrow-flow';
import { openRazorpayCheckout } from '@/lib/payments/razorpay';

type PackageType = 'reel' | 'post' | 'story' | 'reel+story' | 'reel+post';

type BookingInput = {
  influencer_profile_id: string;
  package_type: PackageType;
  objective:
    | 'visit_place'
    | 'feature_product'
    | 'showcase_service'
    | 'promote_offer'
    | 'brand_shoutout';
  timing_mode: 'asap' | 'choose_date';
  due_date?: string;
  event_name?: string;
  contact_email: string;
  contact_phone: string;
};

function createIdempotencyKey() {
  return `booking-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function runBookingPaymentFlow(input: BookingInput) {
  const order = await createBookingOrder({
    influencer_profile_id: input.influencer_profile_id,
    package_type: input.package_type,
  });
  const razorpayKey = order.keyId ?? process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;
  if (!razorpayKey) {
    throw new Error(
      'Razorpay checkout key is missing. Configure RAZORPAY_KEY_ID on the API or EXPO_PUBLIC_RAZORPAY_KEY_ID in apps/mobile/.env.',
    );
  }
  const payment = await openRazorpayCheckout({
    key: razorpayKey,
    amount: String(order.amount),
    currency: order.currency,
    name: 'Plugoh',
    description: 'Campaign booking',
    order_id: order.orderId,
    prefill: { email: input.contact_email, contact: input.contact_phone },
    theme: { color: '#E11D48' },
  });
  const payload = {
    razorpay_order_id: payment.razorpay_order_id,
    razorpay_payment_id: payment.razorpay_payment_id,
    razorpay_signature: payment.razorpay_signature,
    influencer_profile_id: input.influencer_profile_id,
    package_type: input.package_type,
    objective: input.objective,
    timing_mode: input.timing_mode,
    due_date: input.due_date,
    event_name: input.event_name,
    contact_email: input.contact_email,
    contact_phone: input.contact_phone,
  };
  const idempotencyKey = createIdempotencyKey();
  await setPendingBookingVerify({ idempotencyKey, payload, createdAt: Date.now() });
  const verified = await verifyBookingPayment(payload, idempotencyKey);
  await clearPendingBookingVerify();
  return { ...verified, pricing: order };
}

export async function recoverPendingBookingVerify() {
  const pending = await getPendingBookingVerify();
  if (!pending) return null;
  const result = await verifyBookingPayment(
    pending.payload as Parameters<typeof verifyBookingPayment>[0],
    pending.idempotencyKey,
  );
  await clearPendingBookingVerify();
  return result;
}
