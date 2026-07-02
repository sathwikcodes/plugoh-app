import type { UserRole } from '@plugoh/contracts';
import type {
  AiProvider,
  GeocodingProvider,
  PaymentProvider,
  StorageProvider,
  WeatherProvider,
} from '../../clients/providers.js';
import { badRequest, notFound } from '../../core/errors.js';
import { logger } from '../../core/logger.js';
import type { DataStore } from '../../repositories/data-store.js';
import type { AuthUser } from '../../types.js';
import {
  campaignForParticipant,
  futureIso,
  geocodeValues,
  HOUR_MS,
  moneyPaise,
  packagePricePaise,
  paginateRows,
  platformFeePaise,
  nowIso,
  requireCampaignRole,
  requireStatus,
  withBusinessProfileImage,
  withInfluencerProfileImage,
  type Row,
} from '../../services/shared.js';
import { NotificationService } from '../notifications/service.js';
import { ProfileService } from '../profiles/service.js';

const DEFAULT_BOOKING_OBJECTIVE = 'brand_shoutout';
const DEFAULT_TIMING_MODE = 'asap';

function campaignTimingBrief(input: Row) {
  if (input.timing_mode === 'choose_date') {
    return input.due_date ? `Due date: ${input.due_date}` : undefined;
  }
  return 'Timing: ASAP';
}

function creativeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 240);
}

function campaignCreativePath(campaignId: string, mimeType: 'image/png' | 'image/jpeg') {
  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  return `campaigns/${campaignId}/card.${ext}`;
}

export class CampaignService {
  constructor(
    private readonly store: DataStore,
    private readonly notifications: NotificationService,
    private readonly payment?: PaymentProvider,
    private readonly storage?: StorageProvider,
    private readonly ai?: AiProvider,
    private readonly geocoding?: GeocodingProvider,
    private readonly weather?: WeatherProvider,
  ) {}

  async create(
    user: AuthUser,
    input: Row,
    paymentInput: Partial<Row> = {},
    options: { skipCreative?: boolean } = {},
  ) {
    const profileService = new ProfileService(this.store, this.geocoding);
    await profileService.assertBusinessComplete(user.id);
    const influencer = await this.store.findOne<Row>('influencer_profiles', {
      eq: { id: input.influencer_profile_id, is_active: true },
    });
    if (!influencer) throw notFound('Influencer profile');
    const quotedPricePaise =
      paymentInput.price_offered_paise == null
        ? undefined
        : moneyPaise(paymentInput.price_offered_paise);
    const pricePaise = quotedPricePaise ?? packagePricePaise(influencer, input.package_type);
    if (input.influencer_id && input.influencer_id !== influencer.user_id)
      throw badRequest('INFLUENCER_MISMATCH', 'Influencer does not match profile');
    const quotedFeePaise =
      paymentInput.platform_fee_paise == null
        ? undefined
        : moneyPaise(paymentInput.platform_fee_paise);
    const feePaise = quotedFeePaise ?? platformFeePaise(pricePaise);
    const totalPaise = moneyPaise(paymentInput.total_charged_paise ?? pricePaise + feePaise);
    const objective = input.objective ?? DEFAULT_BOOKING_OBJECTIVE;
    const timingMode = input.timing_mode ?? DEFAULT_TIMING_MODE;
    const title = `${objective.replaceAll('_', ' ')} with ${
      influencer.display_name ?? influencer.instagram_username ?? 'influencer'
    }`;
    const [businessProfile, businessAccount] = await Promise.all([
      this.store.findOne<Row>('business_profiles', { eq: { user_id: user.id } }),
      this.store.findOne<Row>('profiles', { eq: { id: user.id } }),
    ]);
    const campaignLocation = input.place_name || businessProfile?.brand_location;
    const brief = [
      `Objective: ${objective}`,
      `Package: ${input.package_type}`,
      campaignTimingBrief({ timing_mode: timingMode, due_date: input.due_date }),
      input.place_name ? `Place: ${input.place_name}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');
    const campaign = await this.store.insert<Row>('campaigns', {
      business_id: user.id,
      influencer_id: influencer.user_id,
      influencer_profile_id: input.influencer_profile_id,
      title,
      brief,
      notes: input.notes,
      package_type: input.package_type,
      objective,
      timing_mode: timingMode,
      due_date: input.due_date,
      place_name: input.place_name,
      ...(await geocodeValues(this.geocoding, campaignLocation, 'place')),
      price_offered_paise: pricePaise,
      platform_fee_paise: feePaise,
      status: paymentInput.status ?? 'pre_authorized',
      business_contact_email: businessAccount?.email,
      business_contact_phone: businessAccount?.phone,
      pre_authorized_at: nowIso(),
      expires_at: paymentInput.expires_at ?? futureIso(24 * HOUR_MS),
      created_at: nowIso(),
      updated_at: nowIso(),
    });
    if (paymentInput.provider_order_id) {
      await this.store.insert('payment_orders', {
        campaign_id: campaign.id,
        provider: 'razorpay',
        provider_order_id: paymentInput.provider_order_id,
        provider_payment_id: paymentInput.provider_payment_id,
        payment_method: paymentInput.payment_method ?? 'card',
        status: paymentInput.payment_order_status ?? 'authorized',
        amount_paise: totalPaise,
        currency: 'INR',
        authorized_at: paymentInput.authorized_at ?? nowIso(),
        metadata: {},
        created_at: nowIso(),
        updated_at: nowIso(),
      });
    }
    await this.notifications.create(
      influencer.user_id,
      'new_booking',
      this.notificationData(campaign, influencer),
    );
    const message = await this.store.insert<Row>('campaign_messages', {
      campaign_id: campaign.id,
      sender_id: user.id,
      message_type: 'booking_card',
      content: title,
      metadata: { campaignId: campaign.id },
      created_at: nowIso(),
    });
    await this.store.upsert(
      'campaign_message_reads',
      { message_id: message.id, user_id: user.id, read_at: nowIso() },
      'message_id,user_id',
    );
    if (!options.skipCreative) {
      await this.generateCreative(campaign.id);
    }
    return { campaignId: campaign.id };
  }

  async list(user: AuthUser, role: UserRole, query: Row = {}) {
    const key = role === 'business' ? 'business_id' : 'influencer_id';
    let campaigns = await this.store.list<Row>('campaigns', {
      eq: { [key]: user.id },
      order: { column: 'created_at', ascending: false },
    });
    if (query.status) campaigns = campaigns.filter((campaign) => campaign.status === query.status);
    if (query.search) {
      const term = String(query.search).toLowerCase();
      campaigns = campaigns.filter((campaign) =>
        [campaign.ai_title, campaign.title, campaign.brief, campaign.package_type].some((value) =>
          String(value ?? '')
            .toLowerCase()
            .includes(term),
        ),
      );
    }
    switch (query.sort) {
      case 'created_asc':
        campaigns.sort((a, b) =>
          String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')),
        );
        break;
      case 'amount_desc':
        campaigns.sort(
          (a, b) =>
            Number(b.total_charged_paise ?? b.price_offered_paise ?? 0) -
            Number(a.total_charged_paise ?? a.price_offered_paise ?? 0),
        );
        break;
      case 'amount_asc':
        campaigns.sort(
          (a, b) =>
            Number(a.total_charged_paise ?? a.price_offered_paise ?? 0) -
            Number(b.total_charged_paise ?? b.price_offered_paise ?? 0),
        );
        break;
      default:
        campaigns.sort((a, b) =>
          String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')),
        );
        break;
    }
    return paginateRows(await this.withProfilesMany(campaigns), query);
  }

  async get(user: AuthUser, id: string) {
    const campaign = await campaignForParticipant(this.store, id, user.id);
    const delivery = await this.store.findOne<Row>('deliveries', { eq: { campaign_id: id } });
    const messages = await this.store.list<Row>('campaign_messages', {
      eq: { campaign_id: id },
      order: { column: 'created_at', ascending: true },
    });
    return { ...(await this.withProfiles(campaign)), delivery, messages };
  }

  async generateCreative(id: string) {
    const campaign = await this.store.getById<Row>('campaigns', id);
    if (!campaign) throw notFound('Campaign');
    if (campaign.card_image_url || campaign.creative_status === 'ready') {
      return campaign;
    }

    await this.store.update(
      'campaigns',
      { eq: { id } },
      { creative_status: 'pending', creative_error: null, updated_at: nowIso() },
    );

    if (!this.ai || !this.storage) {
      const error = 'Campaign creative requires configured AI and storage providers';
      await this.markCreativeFailed(id, error);
      return { ...campaign, creative_status: 'failed', creative_error: error };
    }

    try {
      const [business, influencer] = await Promise.all([
        this.store.findOne<Row>('business_profiles', { eq: { user_id: campaign.business_id } }),
        this.store.findOne<Row>('influencer_profiles', { eq: { user_id: campaign.influencer_id } }),
      ]);
      const creative = await this.ai.generateCampaignCreative({
        campaign,
        businessProfile: business,
        influencerProfile: influencer,
      });
      const upload = await this.storage.uploadCampaignCardImage({
        path: campaignCreativePath(id, creative.imageMimeType),
        bytes: creative.imageBytes,
        contentType: creative.imageMimeType,
      });
      const [updated] = await this.store.update<Row>(
        'campaigns',
        { eq: { id } },
        {
          ai_title: creative.title,
          card_image_url: upload.publicUrl,
          card_image_path: upload.path,
          card_image_prompt: creative.imagePrompt,
          creative_status: 'ready',
          creative_error: null,
          creative_generated_at: nowIso(),
          updated_at: nowIso(),
        },
      );
      return updated ?? (await this.store.getById<Row>('campaigns', id)) ?? campaign;
    } catch (error) {
      const message = creativeErrorMessage(error);
      logger.warn({ err: error, campaignId: id }, 'Campaign creative generation failed');
      await this.markCreativeFailed(id, message);
      return { ...campaign, creative_status: 'failed', creative_error: message };
    }
  }

  private async markCreativeFailed(id: string, message: string) {
    await this.store.update(
      'campaigns',
      { eq: { id } },
      {
        creative_status: 'failed',
        creative_error: message,
        updated_at: nowIso(),
      },
    );
  }

  async accept(user: AuthUser, id: string) {
    const accepted = await this.store.rpc<Row>('accept_campaign', {
      p_campaign_id: id,
      p_actor: user.id,
    });
    await this.notifications.create(
      accepted.business_id,
      'booking_accepted',
      this.notificationData(accepted),
    );

    const paymentOrder = await this.store.findOne<Row>('payment_orders', {
      eq: { campaign_id: id },
    });
    if (!paymentOrder?.provider_payment_id) {
      return { ok: true };
    }

    await this.payment?.capturePayment(
      String(paymentOrder.provider_payment_id),
      moneyPaise(paymentOrder.amount_paise),
    );
    const captured = await this.store.rpc<Row>('confirm_campaign_capture', {
      p_campaign_id: id,
      p_actor: user.id,
      p_provider_payment_id: paymentOrder.provider_payment_id,
      p_payment_method: paymentOrder.payment_method ?? 'card',
    });
    await this.notifications.create(
      captured.influencer_id,
      'payment_secured',
      this.notificationData(captured),
    );
    return { ok: true };
  }

  async decline(user: AuthUser, id: string) {
    const declined = await this.store.rpc<{ campaign: Row; should_refund: boolean }>(
      'decline_campaign',
      {
        p_campaign_id: id,
        p_actor: user.id,
      },
    );
    const campaign = declined.campaign;
    if (declined.should_refund) {
      await issueRefund(this.store, this.payment, campaign, 'declined');
    }
    await this.notifications.create(
      campaign.business_id,
      'booking_declined',
      this.notificationData(campaign),
    );
    return { ok: true };
  }

  async approve(user: AuthUser, id: string) {
    const campaign = await requireCampaignRole(this.store, id, user.id, 'business');
    requireStatus(campaign, ['delivery_submitted', 'completed']);
    await this.release(campaign, user.id);
    return { ok: true };
  }

  async dispute(user: AuthUser, id: string, reason: string) {
    const campaign = await requireCampaignRole(this.store, id, user.id, 'business');
    requireStatus(campaign, ['delivery_submitted']);
    const transitioned = await this.store.rpc<Row>('request_delivery_changes', {
      p_campaign_id: id,
      p_actor: user.id,
      p_change_request_note: reason,
    });
    await this.notifications.createForMany(
      [campaign.business_id, campaign.influencer_id],
      'changes_requested',
      this.notificationData(transitioned),
    );
    return { ok: true };
  }

  async release(campaign: Row, approvedBy?: string, notify = true) {
    const transitioned = await this.store.rpc<Row>('release_escrow', {
      p_campaign_id: campaign.id,
      p_actor: approvedBy ?? null,
    });
    const existingLedger = await this.store.list<Row>('escrow_ledger_entries', {
      eq: { campaign_id: transitioned.id },
      in: { entry_type: ['payout_influencer', 'platform_fee'] },
    });
    const alreadyReleased =
      existingLedger.some((row) => row.entry_type === 'payout_influencer') &&
      existingLedger.some((row) => row.entry_type === 'platform_fee');
    if (notify && campaign.status !== 'completed') {
      await this.notifications.create(
        transitioned.influencer_id,
        'booking_completed',
        this.notificationData(transitioned),
      );
    }
    return { alreadyReleased };
  }

  async withProfiles(campaign: Row) {
    const [business, businessAccount, influencer, influencerAccount] = await Promise.all([
      this.store.findOne<Row>('business_profiles', { eq: { user_id: campaign.business_id } }),
      this.store.findOne<Row>('profiles', { eq: { id: campaign.business_id } }),
      this.store.findOne<Row>('influencer_profiles', { eq: { user_id: campaign.influencer_id } }),
      this.store.findOne<Row>('profiles', { eq: { id: campaign.influencer_id } }),
    ]);
    const businessProfile = withBusinessProfileImage(business, businessAccount);
    return {
      ...campaign,
      business_profile: businessProfile,
      influencer_profile: withInfluencerProfileImage(influencer, influencerAccount),
      location_weather: await this.locationWeather(campaign, businessProfile),
    };
  }

  private async locationWeather(campaign: Row, businessProfile?: Row | null) {
    if (!this.weather) return null;
    const latitude = Number(campaign.place_latitude ?? businessProfile?.brand_latitude);
    const longitude = Number(campaign.place_longitude ?? businessProfile?.brand_longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    try {
      return await this.weather.current({ latitude, longitude });
    } catch (error) {
      logger.warn({ err: error, campaignId: campaign.id }, 'location weather lookup failed');
      return null;
    }
  }

  async withProfilesMany(campaigns: Row[]) {
    if (campaigns.length === 0) return [];
    const businessIds = [
      ...new Set(campaigns.map((campaign) => campaign.business_id).filter(Boolean)),
    ];
    const influencerIds = [
      ...new Set(campaigns.map((campaign) => campaign.influencer_id).filter(Boolean)),
    ];
    const [businessProfiles, businessAccounts, influencerProfiles, influencerAccounts] =
      await Promise.all([
        businessIds.length
          ? this.store.list<Row>('business_profiles', { in: { user_id: businessIds } })
          : [],
        businessIds.length ? this.store.list<Row>('profiles', { in: { id: businessIds } }) : [],
        influencerIds.length
          ? this.store.list<Row>('influencer_profiles', { in: { user_id: influencerIds } })
          : [],
        influencerIds.length ? this.store.list<Row>('profiles', { in: { id: influencerIds } }) : [],
      ]);
    const businessByUserId = new Map(businessProfiles.map((profile) => [profile.user_id, profile]));
    const accountByUserId = new Map(businessAccounts.map((account) => [account.id, account]));
    const influencerByUserId = new Map(
      influencerProfiles.map((profile) => [profile.user_id, profile]),
    );
    const influencerAccountByUserId = new Map(
      influencerAccounts.map((account) => [account.id, account]),
    );
    return campaigns.map((campaign) => ({
      ...campaign,
      business_profile: withBusinessProfileImage(
        businessByUserId.get(campaign.business_id),
        accountByUserId.get(campaign.business_id),
      ),
      influencer_profile: withInfluencerProfileImage(
        influencerByUserId.get(campaign.influencer_id),
        influencerAccountByUserId.get(campaign.influencer_id),
      ),
    }));
  }

  notificationData(campaign: Row, influencer?: Row) {
    return {
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      influencerName: influencer?.display_name,
      amount_paise: campaign.price_offered_paise,
    };
  }
}

async function issueRefund(
  store: DataStore,
  payment: PaymentProvider | undefined,
  campaign: Row,
  reason: 'declined' | 'expired',
) {
  const paymentOrder = await store.findOne<Row>('payment_orders', {
    eq: { campaign_id: campaign.id },
  });
  if (!paymentOrder?.provider_payment_id) return;
  const refund = await payment?.refundPayment(
    String(paymentOrder.provider_payment_id),
    moneyPaise(campaign.total_charged_paise),
  );
  await store.rpc<Row>('record_campaign_refund', {
    p_campaign_id: campaign.id,
    p_actor: null,
    p_provider_refund_id: refund?.id ?? null,
    p_amount_paise: moneyPaise(campaign.total_charged_paise),
    p_reason: reason,
  });
}
