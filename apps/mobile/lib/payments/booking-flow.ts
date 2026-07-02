import { createBookingOrder, verifyBookingPayment } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/error';
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
  notes?: string;
};

export type BookingPaymentFlowStatus = 'creating_order' | 'opening_checkout' | 'verifying';

type BookingPaymentFlowOptions = {
  onStatusChange?: (status: BookingPaymentFlowStatus) => void;
  verifyRetryDelaysMs?: number[];
};

const DEFAULT_VERIFY_RETRY_DELAYS_MS = [750, 1500, 2500, 3500, 5000];

function createIdempotencyKey(scope: 'order' | 'verify') {
  return `booking-${scope}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function bookingPayloadFromInput(input: BookingInput): CreateBookingOrderRequest {
  const notes = input.notes?.trim();
  return {
    influencer_profile_id: input.influencer_profile_id,
    package_type: input.package_type,
    ...(notes ? { notes } : {}),
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

function shouldRetryBookingVerification(error: unknown) {
  if (error instanceof ApiError) {
    return (
      error.code === 'TIMEOUT' ||
      error.code === 'NETWORK_ERROR' ||
      error.status === 408 ||
      error.status === 429 ||
      error.status >= 500
    );
  }
  return true;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyBookingPaymentWithRetry(
  payload: VerifyBookingPaymentRequest,
  idempotencyKey: string,
  retryDelaysMs = DEFAULT_VERIFY_RETRY_DELAYS_MS,
) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    try {
      return await verifyBookingPayment(payload, idempotencyKey);
    } catch (error) {
      lastError = error;
      if (!shouldRetryBookingVerification(error) || attempt >= retryDelaysMs.length) break;
      await wait(retryDelaysMs[attempt]);
    }
  }
  throw lastError;
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
  const verified = await verifyBookingPaymentWithRetry(
    payload,
    verifyIdempotencyKey,
    options.verifyRetryDelaysMs,
  );
  await clearPendingBookingVerify();
  return { ...verified, pricing: order };
}

export async function recoverPendingBookingVerify() {
  const pending = await getPendingBookingVerify();
  if (!pending) return null;
  if (!isBookingVerificationPayload(pending.payload)) return null;
  const result = await verifyBookingPaymentWithRetry(pending.payload, pending.idempotencyKey);
  await clearPendingBookingVerify();
  return result;
}
