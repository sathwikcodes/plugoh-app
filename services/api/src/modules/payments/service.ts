import { verifyHmacSha256, type PaymentProvider } from '../../clients/providers.js';
import type { EnvConfig } from '../../config/env.js';
import { badRequest, conflict, forbidden, notFound } from '../../core/errors.js';
import { logger } from '../../core/logger.js';
import type { DataStore } from '../../repositories/data-store.js';
import type { AuthUser } from '../../types.js';
import {
  futureIso,
  HOUR_MS,
  moneyPaise,
  packagePricePaise,
  platformFeePaise,
  nowIso,
  requireCampaignRole,
  requireStatus,
  type Row,
} from '../../services/shared.js';
import { CampaignService } from '../campaigns/service.js';
import { NotificationService } from '../notifications/service.js';
import { ProfileService } from '../profiles/service.js';

function isMissingBookingPaymentIntentsTable(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    code === '42P01' && typeof message === 'string' && message.includes('booking_payment_intents')
  );
}

export class PaymentService {
  constructor(
    private readonly store: DataStore,
    private readonly notifications: NotificationService,
    private readonly campaigns: CampaignService,
    private readonly config: EnvConfig,
    private readonly payment?: PaymentProvider,
  ) {}

  private requirePayment() {
    if (!this.payment)
      throw badRequest('PAYMENT_PROVIDER_UNAVAILABLE', 'Payment provider is not configured');
    return this.payment;
  }

  private cardSummary(row: Row) {
    return {
      id: String(row.id),
      provider: String(row.provider ?? 'razorpay'),
      brand: typeof row.brand === 'string' ? row.brand : undefined,
      network: typeof row.network === 'string' ? row.network : undefined,
      type: typeof row.card_type === 'string' ? row.card_type : undefined,
      issuer: typeof row.issuer === 'string' ? row.issuer : undefined,
      last4: typeof row.last4 === 'string' ? row.last4 : undefined,
      created_at: typeof row.created_at === 'string' ? row.created_at : undefined,
      updated_at: typeof row.updated_at === 'string' ? row.updated_at : undefined,
    };
  }

  async listSavedCards(user: AuthUser) {
    const rows = await this.store.list<Row>(
      'business_saved_cards',
      {
        eq: { user_id: user.id },
        order: { column: 'updated_at', ascending: false },
      },
      'id,provider,brand,network,card_type,issuer,last4,created_at,updated_at',
    );
    return rows.map((row) => this.cardSummary(row));
  }

  private async saveCardFromPayment(
    user: AuthUser,
    payment: Awaited<ReturnType<PaymentProvider['fetchPayment']>>,
  ) {
    if (payment.method !== 'card') return;
    const card = payment.card;
    const providerCardId = payment.card_id ?? card?.id ?? payment.id;
    const last4 = card?.last4?.trim();
    if (!providerCardId && !last4) return;
    const timestamp = nowIso();
    await this.store.upsert<Row>(
      'business_saved_cards',
      {
        user_id: user.id,
        provider: 'razorpay',
        provider_card_id: providerCardId,
        provider_payment_id: payment.id,
        brand: card?.network ?? undefined,
        network: card?.network ?? undefined,
        card_type: card?.type ?? undefined,
        issuer: card?.issuer ?? undefined,
        last4,
        updated_at: timestamp,
      },
      'user_id,provider,provider_card_id',
    );
  }

  async createEscrowOrder(user: AuthUser, campaignId: string) {
    const campaign = await requireCampaignRole(this.store, campaignId, user.id, 'business');
    requireStatus(campaign, ['pre_authorized']);
    const provider = this.requirePayment();
    const existing = await this.store.findOne<Row>('payment_orders', {
      eq: { campaign_id: campaign.id },
    });
    const order = existing?.provider_order_id
      ? await provider.fetchOrder(String(existing.provider_order_id))
      : await provider.createOrder({
          amount: moneyPaise(campaign.total_charged_paise),
          currency: 'INR',
          receipt: campaign.id,
          payment_capture: 0,
        });
    if (!existing?.provider_order_id) {
      await this.store.insert('payment_orders', {
        campaign_id: campaign.id,
        provider: 'razorpay',
        provider_order_id: order.id,
        status: 'created',
        amount_paise: order.amount,
        currency: order.currency,
        metadata: {},
        created_at: nowIso(),
        updated_at: nowIso(),
      });
    }
    return { orderId: order.id, amount: order.amount, currency: order.currency };
  }

  async verifyEscrow(user: AuthUser, input: Row) {
    const campaign = await requireCampaignRole(this.store, input.campaign_id, user.id, 'business');
    const existingOrder = await this.store.findOne<Row>('payment_orders', {
      eq: { campaign_id: campaign.id, provider_payment_id: input.razorpay_payment_id },
    });
    if (campaign.status === 'in_escrow' && existingOrder) {
      return { success: true, campaignId: campaign.id };
    }
    requireStatus(campaign, ['capture_pending']);
    const provider = this.requirePayment();
    if (
      !provider.verifySignature({
        orderId: input.razorpay_order_id,
        paymentId: input.razorpay_payment_id,
        signature: input.razorpay_signature,
      })
    ) {
      throw forbidden('Invalid Razorpay signature');
    }
    const payment = await provider.fetchPayment(input.razorpay_payment_id);
    const transitioned = await this.store.rpc<Row>('confirm_campaign_capture', {
      p_campaign_id: campaign.id,
      p_actor: user.id,
      p_provider_payment_id: input.razorpay_payment_id,
      p_payment_method: payment.method,
    });
    await this.saveCardFromPayment(user, payment);
    await this.notifications.create(
      transitioned.influencer_id,
      'payment_secured',
      this.campaigns.notificationData(transitioned),
    );
    return { success: true, campaignId: campaign.id };
  }

  async createBookingOrder(user: AuthUser, input: Row) {
    const profileService = new ProfileService(this.store);
    await profileService.assertBusinessComplete(user.id);
    const bookingPayload = this.normalizeBookingPayload(input);
    const influencer = await this.store.getById<Row>(
      'influencer_profiles',
      bookingPayload.influencer_profile_id,
    );
    if (!influencer || influencer.is_active !== true) throw notFound('Influencer profile');
    const pricePaise = packagePricePaise(influencer, bookingPayload.package_type);
    const feePaise = platformFeePaise(pricePaise);
    const totalPaise = pricePaise + feePaise;
    const order = await this.requirePayment().createOrder({
      amount: totalPaise,
      currency: 'INR',
      payment_capture: 0,
    });
    let intent: Row | null = null;
    try {
      intent = await this.store.insert<Row>('booking_payment_intents', {
        business_id: user.id,
        influencer_profile_id: bookingPayload.influencer_profile_id,
        package_type: bookingPayload.package_type,
        booking_payload: bookingPayload,
        provider: 'razorpay',
        provider_order_id: order.id,
        status: 'created',
        price_offered_paise: pricePaise,
        platform_fee_paise: feePaise,
        total_charged_paise: totalPaise,
        currency: order.currency,
        created_at: nowIso(),
        updated_at: nowIso(),
      });
    } catch (error) {
      if (!isMissingBookingPaymentIntentsTable(error)) throw error;
      logger.warn(
        {
          orderId: order.id,
          error: error instanceof Error ? error.message : String(error),
        },
        'Booking payment intents table is unavailable; using legacy booking verification',
      );
    }
    return {
      ...(intent?.id ? { bookingIntentId: intent.id } : {}),
      orderId: order.id,
      keyId: this.config.razorpayKeyId,
      amount: order.amount,
      currency: order.currency,
      price_offered_paise: pricePaise,
      platform_fee_paise: feePaise,
      total_charged_paise: totalPaise,
    };
  }

  async verifyBookingPayment(user: AuthUser, input: Row) {
    if (input.booking_intent_id) {
      return this.verifyBookingPaymentIntent(user, input);
    }
    return this.verifyLegacyBookingPayment(user, input);
  }

  private normalizeBookingPayload(input: Row) {
    return {
      influencer_id: input.influencer_id,
      influencer_profile_id: input.influencer_profile_id,
      package_type: input.package_type,
      objective: input.objective,
      timing_mode: input.timing_mode,
      due_date: input.due_date,
      place_name: input.place_name,
      notes: input.notes,
    };
  }

  private bookingPayloadFromIntent(intent: Row) {
    const payload =
      typeof intent.booking_payload === 'string'
        ? (JSON.parse(intent.booking_payload) as Row)
        : intent.booking_payload;
    return this.normalizeBookingPayload(payload ?? {});
  }

  private async verifyBookingPaymentIntent(user: AuthUser, input: Row) {
    const intent = await this.store.getById<Row>(
      'booking_payment_intents',
      input.booking_intent_id,
    );
    if (!intent) throw notFound('Booking payment intent');
    if (intent.business_id !== user.id) throw forbidden('Business payment intent required');
    if (intent.status === 'completed' && intent.campaign_id) {
      return { success: true, campaignId: intent.campaign_id };
    }
    if (intent.provider_order_id !== input.razorpay_order_id) {
      throw conflict(
        'PAYMENT_ORDER_MISMATCH',
        'Payment verification does not match this booking order',
      );
    }
    const provider = this.requirePayment();
    if (
      !provider.verifySignature({
        orderId: input.razorpay_order_id,
        paymentId: input.razorpay_payment_id,
        signature: input.razorpay_signature,
      })
    ) {
      throw forbidden('Invalid Razorpay signature');
    }
    const existingOrder = await this.store.findOne<Row>('payment_orders', {
      eq: { provider: 'razorpay', provider_order_id: input.razorpay_order_id },
    });
    if (existingOrder?.campaign_id) {
      await this.store.update(
        'booking_payment_intents',
        { eq: { id: intent.id } },
        {
          status: 'completed',
          campaign_id: existingOrder.campaign_id,
          provider_payment_id: input.razorpay_payment_id,
          updated_at: nowIso(),
          completed_at: nowIso(),
        },
      );
      return { success: true, campaignId: existingOrder.campaign_id };
    }
    const order = await provider.fetchOrder(input.razorpay_order_id);
    const expectedAmount = moneyPaise(intent.total_charged_paise);
    if (order.amount !== expectedAmount || order.currency !== intent.currency) {
      await this.store.update(
        'booking_payment_intents',
        { eq: { id: intent.id } },
        {
          status: 'failed',
          provider_payment_id: input.razorpay_payment_id,
          failure_reason: 'Paid order amount does not match the requested booking amount',
          updated_at: nowIso(),
          failed_at: nowIso(),
        },
      );
      throw conflict(
        'PAYMENT_AMOUNT_MISMATCH',
        'Paid order amount does not match the requested booking amount',
      );
    }
    const payment = await provider.fetchPayment(input.razorpay_payment_id);
    if (payment.method !== 'card') {
      await this.store.update(
        'booking_payment_intents',
        { eq: { id: intent.id } },
        {
          status: 'failed',
          provider_payment_id: input.razorpay_payment_id,
          payment_method: payment.method,
          failure_reason: 'Only card pre-authorization is supported',
          updated_at: nowIso(),
          failed_at: nowIso(),
        },
      );
      throw badRequest('UNSUPPORTED_PAYMENT_METHOD', 'Only card pre-authorization is supported');
    }
    await this.store.update(
      'booking_payment_intents',
      { eq: { id: intent.id } },
      {
        status: 'authorized',
        provider_payment_id: input.razorpay_payment_id,
        payment_method: payment.method,
        updated_at: nowIso(),
      },
    );
    await this.saveCardFromPayment(user, payment);
    const bookingPayload = this.bookingPayloadFromIntent(intent);
    const created = await this.campaigns.create(
      user,
      bookingPayload,
      {
        status: 'pre_authorized',
        provider_order_id: input.razorpay_order_id,
        provider_payment_id: input.razorpay_payment_id,
        payment_method: payment.method,
        payment_order_status: 'authorized',
        price_offered_paise: intent.price_offered_paise,
        platform_fee_paise: intent.platform_fee_paise,
        total_charged_paise: intent.total_charged_paise,
        authorized_at: nowIso(),
        expires_at: futureIso(24 * HOUR_MS),
      },
      { skipCreative: true },
    );
    await this.store.update(
      'booking_payment_intents',
      { eq: { id: intent.id } },
      {
        status: 'completed',
        campaign_id: created.campaignId,
        updated_at: nowIso(),
        completed_at: nowIso(),
      },
    );
    await this.campaigns.generateCreative(created.campaignId);
    return { success: true, campaignId: created.campaignId };
  }

  private async verifyLegacyBookingPayment(user: AuthUser, input: Row) {
    const normalizedInput = this.normalizeBookingPayload(input);
    const existingOrder = await this.store.findOne<Row>('payment_orders', {
      eq: { provider: 'razorpay', provider_order_id: input.razorpay_order_id },
    });
    if (existingOrder) return { success: true, campaignId: existingOrder.campaign_id };
    const provider = this.requirePayment();
    if (
      !provider.verifySignature({
        orderId: input.razorpay_order_id,
        paymentId: input.razorpay_payment_id,
        signature: input.razorpay_signature,
      })
    ) {
      throw forbidden('Invalid Razorpay signature');
    }
    const influencer = await this.store.getById<Row>(
      'influencer_profiles',
      normalizedInput.influencer_profile_id,
    );
    if (!influencer || influencer.is_active !== true) throw notFound('Influencer profile');
    const pricePaise = packagePricePaise(influencer, normalizedInput.package_type);
    if (normalizedInput.influencer_id && normalizedInput.influencer_id !== influencer.user_id)
      throw badRequest('INFLUENCER_MISMATCH', 'Influencer does not match profile');
    const order = await provider.fetchOrder(input.razorpay_order_id);
    const expectedAmount = pricePaise + platformFeePaise(pricePaise);
    if (order.amount !== expectedAmount) {
      throw conflict(
        'PAYMENT_AMOUNT_MISMATCH',
        'Paid order amount does not match the requested booking amount',
      );
    }
    const payment = await provider.fetchPayment(input.razorpay_payment_id);
    if (payment.method !== 'card') {
      throw badRequest('UNSUPPORTED_PAYMENT_METHOD', 'Only card pre-authorization is supported');
    }
    await this.saveCardFromPayment(user, payment);
    const created = await this.campaigns.create(
      user,
      { ...normalizedInput, influencer_id: influencer.user_id },
      {
        status: 'pre_authorized',
        provider_order_id: input.razorpay_order_id,
        provider_payment_id: input.razorpay_payment_id,
        payment_method: 'card',
        payment_order_status: 'authorized',
        authorized_at: nowIso(),
        expires_at: futureIso(24 * HOUR_MS),
      },
      { skipCreative: true },
    );
    await this.campaigns.generateCreative(created.campaignId);
    return { success: true, campaignId: created.campaignId };
  }

  async captureBookingPayment(campaignId: string) {
    const campaign = await this.store.getById<Row>('campaigns', campaignId);
    if (!campaign) throw notFound('Campaign');
    const paymentOrder = await this.store.findOne<Row>('payment_orders', {
      eq: { campaign_id: campaignId },
    });
    if (!paymentOrder?.provider_payment_id) throw notFound('Payment order');
    await this.requirePayment().capturePayment(
      String(paymentOrder.provider_payment_id),
      moneyPaise(paymentOrder.amount_paise),
    );
    await this.store.rpc<Row>('confirm_campaign_capture', {
      p_campaign_id: campaignId,
      p_actor: null,
      p_provider_payment_id: paymentOrder.provider_payment_id,
      p_payment_method: paymentOrder.payment_method ?? 'card',
    });
    return { ok: true };
  }

  async releaseEscrow(user: AuthUser | undefined, campaignId: string, notify = true) {
    const campaign = user
      ? await requireCampaignRole(this.store, campaignId, user.id, 'business')
      : await this.store.getById<Row>('campaigns', campaignId);
    if (!campaign) throw notFound('Campaign');
    requireStatus(campaign, ['delivery_submitted', 'completed']);
    return { ok: true, ...(await this.campaigns.release(campaign, user?.id, notify)) };
  }

  async webhook(rawBody: string, signature?: string) {
    if (!this.config.razorpayWebhookSecret)
      throw forbidden('Razorpay webhook secret is not configured');
    if (
      !signature ||
      !verifyHmacSha256({ body: rawBody, signature, secret: this.config.razorpayWebhookSecret })
    ) {
      throw forbidden('Invalid Razorpay webhook signature');
    }
    let event: Row;
    try {
      event = JSON.parse(rawBody) as Row;
    } catch {
      throw badRequest('INVALID_WEBHOOK_BODY', 'Razorpay webhook body must be valid JSON');
    }
    if (event.event === 'payment.failed') {
      const orderId = event.payload?.payment?.entity?.order_id;
      if (orderId) {
        const failureReason =
          event.payload?.payment?.entity?.error_description ?? 'Razorpay payment failed';
        await this.store.update(
          'payment_orders',
          { eq: { provider: 'razorpay', provider_order_id: orderId } },
          { status: 'failed', failure_reason: failureReason, updated_at: nowIso() },
        );
        await this.store.update(
          'booking_payment_intents',
          { eq: { provider: 'razorpay', provider_order_id: orderId } },
          {
            status: 'failed',
            failure_reason: failureReason,
            updated_at: nowIso(),
            failed_at: nowIso(),
          },
        );
      }
    }
    if (event.event === 'refund.processed') {
      const refund = event.payload?.refund?.entity;
      if (refund?.id) {
        await this.store.update(
          'escrow_ledger_entries',
          { eq: { provider_refund_id: refund.id } },
          { status: 'succeeded', updated_at: nowIso() },
        );
      }
    }
    return { ok: true };
  }
}
