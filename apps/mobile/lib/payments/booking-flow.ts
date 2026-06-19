import { createBookingOrder, verifyBookingPayment } from '@/lib/api/endpoints';
import type { CreateBookingOrderRequest, VerifyBookingPaymentRequest } from '@plugoh/contracts';
import {
  clearPendingBookingVerify,
  getPendingBookingVerify,
  setPendingBookingVerify,
} from '@/lib/payments/escrow-flow';
import { openRazorpayCheckout } from '@/lib/payments/razorpay';

type BookingPackageType = Parameters<typeof createBookingOrder>[0]['package_type'];

type BookingInput = {
  influencer_profile_id: string;
  package_type: BookingPackageType;
  objective:
    | 'visit_place'
    | 'feature_product'
    | 'showcase_service'
    | 'promote_offer'
    | 'brand_shoutout';
  timing_mode: 'asap' | 'choose_date';
  due_date?: string;
  event_name?: string;
  place_name?: string;
  contact_email: string;
  contact_phone: string;
};

export type BookingPaymentFlowStatus = 'creating_order' | 'opening_checkout' | 'verifying';

type BookingPaymentFlowOptions = {
  onStatusChange?: (status: BookingPaymentFlowStatus) => void;
};

function createIdempotencyKey(scope: 'order' | 'verify') {
  return `booking-${scope}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function bookingPayloadFromInput(input: BookingInput): CreateBookingOrderRequest {
  return {
    influencer_profile_id: input.influencer_profile_id,
    package_type: input.package_type,
    objective: input.objective,
    timing_mode: input.timing_mode,
    due_date: input.due_date,
    place_name: input.place_name,
    business_contact_email: input.contact_email,
    business_contact_phone: input.contact_phone,
  };
}

function isBookingVerificationPayload(
  payload: Record<string, unknown>,
): payload is VerifyBookingPaymentRequest {
  const hasPaymentDetails =
    typeof payload.razorpay_order_id === 'string' &&
    typeof payload.razorpay_payment_id === 'string' &&
    typeof payload.razorpay_signature === 'string';
  if (!hasPaymentDetails) return false;
  if (typeof payload.booking_intent_id === 'string') return true;
  return (
    typeof payload.influencer_profile_id === 'string' &&
    typeof payload.package_type === 'string' &&
    typeof payload.objective === 'string' &&
    typeof payload.timing_mode === 'string'
  );
}

function checkoutErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const checkoutError = error as Record<string, unknown>;
    if (typeof checkoutError.description === 'string') return checkoutError.description;
    if (typeof checkoutError.reason === 'string') return checkoutError.reason;
    if (typeof checkoutError.message === 'string') return checkoutError.message;
    if (typeof checkoutError.code === 'string') return checkoutError.code;
  }
  return String(error);
}

export async function runBookingPaymentFlow(
  input: BookingInput,
  options: BookingPaymentFlowOptions = {},
) {
  options.onStatusChange?.('creating_order');
  const bookingPayload = bookingPayloadFromInput(input);
  const orderIdempotencyKey = createIdempotencyKey('order');
  const order = await createBookingOrder(bookingPayload, orderIdempotencyKey);
  const verifyIdempotencyKey = createIdempotencyKey('verify');
  await setPendingBookingVerify({
    idempotencyKey: verifyIdempotencyKey,
    payload: order.bookingIntentId ? { booking_intent_id: order.bookingIntentId } : bookingPayload,
    createdAt: Date.now(),
  });
  const razorpayKey = order.keyId ?? process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;
  if (!razorpayKey) {
    await clearPendingBookingVerify();
    throw new Error(
      'Razorpay checkout key is missing. Configure RAZORPAY_KEY_ID on the API or EXPO_PUBLIC_RAZORPAY_KEY_ID in apps/mobile/.env.',
    );
  }
  options.onStatusChange?.('opening_checkout');
  const payment = await openRazorpayCheckout({
    key: razorpayKey,
    amount: String(order.amount),
    currency: order.currency,
    name: 'Plugoh',
    description: 'Campaign booking',
    order_id: order.orderId,
    prefill: { email: input.contact_email, contact: input.contact_phone },
    theme: { color: '#E11D48' },
  }).catch(async (error: unknown) => {
    await clearPendingBookingVerify();
    const message = checkoutErrorMessage(error);
    throw new Error(message.toLowerCase().includes('cancel') ? 'Payment cancelled.' : message);
  });
  const payload: VerifyBookingPaymentRequest = order.bookingIntentId
    ? {
        booking_intent_id: order.bookingIntentId,
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature,
      }
    : {
        ...bookingPayload,
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature,
      };
  await setPendingBookingVerify({
    idempotencyKey: verifyIdempotencyKey,
    payload,
    createdAt: Date.now(),
  });
  options.onStatusChange?.('verifying');
  const verified = await verifyBookingPayment(payload, verifyIdempotencyKey);
  await clearPendingBookingVerify();
  return { ...verified, pricing: order };
}

export async function recoverPendingBookingVerify() {
  const pending = await getPendingBookingVerify();
  if (!pending) return null;
  if (!isBookingVerificationPayload(pending.payload)) return null;
  const result = await verifyBookingPayment(pending.payload, pending.idempotencyKey);
  await clearPendingBookingVerify();
  return result;
}
