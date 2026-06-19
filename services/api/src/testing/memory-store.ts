import crypto from 'node:crypto';
import type { DataStore, QueryOptions } from '../repositories/data-store.js';
import { conflict, forbidden, notFound } from '../core/errors.js';

type Row = Record<string, any>;

export class MemoryDataStore implements DataStore {
  readonly tables = new Map<string, Row[]>();

  constructor(seed: Record<string, Row[]> = {}) {
    for (const [table, rows] of Object.entries(seed)) {
      this.tables.set(
        table,
        rows.map((row) => ({ ...row })),
      );
    }
  }

  async list<T extends Row>(table: string, options: QueryOptions = {}, select = '*') {
    void select;
    return this.applyOptions(this.rows(table), options).map((row) => ({ ...row })) as T[];
  }

  async getById<T extends Row>(table: string, id: string, select = '*') {
    void select;
    const row = this.rows(table).find((item) => item.id === id);
    return row ? ({ ...row } as T) : null;
  }

  async findOne<T extends Row>(table: string, options: QueryOptions, select = '*') {
    void select;
    const row = this.applyOptions(this.rows(table), options)[0];
    return row ? ({ ...row } as T) : null;
  }

  async insert<T extends Row>(table: string, values: Row, select = '*') {
    void select;
    const row = { id: values.id ?? crypto.randomUUID(), ...values };
    if (table === 'campaigns' && row.total_charged_paise == null) {
      row.total_charged_paise =
        Number(row.price_offered_paise ?? 0) + Number(row.platform_fee_paise ?? 0);
    }
    this.rows(table).push(row);
    return { ...row } as unknown as T;
  }

  async update<T extends Row>(table: string, options: QueryOptions, values: Row, select = '*') {
    void select;
    const rows = this.applyOptions(this.rows(table), options);
    for (const row of rows) Object.assign(row, values);
    return rows.map((row) => ({ ...row })) as T[];
  }

  async upsert<T extends Row>(table: string, values: Row, onConflict = 'id', select = '*') {
    void select;
    const keys = onConflict.split(',').map((key) => key.trim());
    const rows = this.rows(table);
    const existing = rows.find((row) => keys.every((key) => row[key] === values[key]));
    if (existing) {
      Object.assign(existing, values);
      return { ...existing } as T;
    }
    return this.insert<T>(table, values);
  }

  async upsertMany<T extends Row>(table: string, values: Row[], onConflict = 'id', select = '*') {
    const results: T[] = [];
    for (const value of values) {
      results.push(await this.upsert<T>(table, value, onConflict, select));
    }
    return results;
  }

  async rpc<T extends Row>(fnName: string, params: Row) {
    switch (fnName) {
      case 'accept_campaign':
        return this.acceptCampaign(params) as T;
      case 'decline_campaign':
        return this.declineCampaign(params) as T;
      case 'confirm_campaign_capture':
        return this.confirmCampaignCapture(params) as T;
      case 'submit_delivery':
        return this.submitDelivery(params) as T;
      case 'request_delivery_changes':
        return this.requestDeliveryChanges(params) as T;
      case 'release_escrow':
        return this.releaseEscrow(params) as T;
      case 'expire_campaign_authorization':
        return this.expireCampaignAuthorization(params) as T;
      case 'record_campaign_refund':
        return this.recordCampaignRefund(params) as T;
      case 'claim_idempotency':
        return this.claimIdempotency(params) as T;
      case 'inbox_summary':
        return this.inboxSummary(params) as T;
      default:
        throw new Error(`Unsupported RPC in MemoryDataStore: ${fnName}`);
    }
  }

  private rows(table: string) {
    if (!this.tables.has(table)) this.tables.set(table, []);
    return this.tables.get(table);
  }

  private applyOptions(rows: Row[], options: QueryOptions) {
    let result = rows.filter((row) => {
      for (const [key, value] of Object.entries(options.eq ?? {})) {
        if (row[key] !== value) return false;
      }
      for (const [key, values] of Object.entries(options.in ?? {})) {
        if (!values.includes(row[key])) return false;
      }
      for (const [key, pattern] of Object.entries(options.ilike ?? {})) {
        if (!ilike(row[key], pattern)) return false;
      }
      for (const [key, value] of Object.entries(options.lt ?? {})) {
        if (!(row[key] < value)) return false;
      }
      for (const [key, value] of Object.entries(options.lte ?? {})) {
        if (!(row[key] <= value)) return false;
      }
      for (const [key, value] of Object.entries(options.gt ?? {})) {
        if (!(row[key] > value)) return false;
      }
      for (const [key, value] of Object.entries(options.gte ?? {})) {
        if (!(row[key] >= value)) return false;
      }
      if (options.or && !matchesOr(row, options.or)) return false;
      return true;
    });
    if (options.order) {
      const direction = options.order.ascending === false ? -1 : 1;
      result = [...result].sort(
        (a, b) =>
          compareOrderedValues(a[options.order.column], b[options.order.column]) * direction,
      );
    }
    if (options.limit) result = result.slice(0, options.limit);
    return result;
  }

  private getCampaignById(campaignId: string) {
    const campaign = this.rows('campaigns').find((row) => row.id === campaignId);
    if (!campaign) throw notFound('Campaign');
    return campaign;
  }

  private assertIllegalTransition(from: unknown, to: string): never {
    throw conflict('ILLEGAL_TRANSITION', `illegal_transition:${stringifyValue(from)}->${to}`);
  }

  private acceptCampaign(params: Row) {
    const campaign = this.getCampaignById(String(params.p_campaign_id));
    if (campaign.influencer_id !== params.p_actor) {
      throw forbidden('Influencer on campaign required');
    }
    if (campaign.status !== 'pre_authorized') {
      this.assertIllegalTransition(campaign.status, 'capture_pending');
    }
    campaign.status = 'capture_pending';
    campaign.accepted_at = new Date().toISOString();
    const paymentOrder = this.rows('payment_orders').find((row) => row.campaign_id === campaign.id);
    if (!paymentOrder || paymentOrder.status !== 'authorized') {
      throw conflict(
        'PAYMENT_ORDER_NOT_AUTHORIZED',
        'Authorized payment order required before creator acceptance',
      );
    }
    paymentOrder.status = 'capture_pending';
    paymentOrder.capture_requested_at = new Date().toISOString();
    return { ...campaign };
  }

  private declineCampaign(params: Row) {
    const campaign = this.getCampaignById(String(params.p_campaign_id));
    if (campaign.influencer_id !== params.p_actor) {
      throw forbidden('Influencer on campaign required');
    }
    if (campaign.status !== 'pre_authorized') {
      this.assertIllegalTransition(campaign.status, 'declined');
    }
    campaign.status = 'declined';
    campaign.declined_at = new Date().toISOString();
    const paymentOrder = this.rows('payment_orders').find((row) => row.campaign_id === campaign.id);
    if (paymentOrder) {
      paymentOrder.status = 'voided';
      paymentOrder.voided_at = new Date().toISOString();
    }
    return { campaign: { ...campaign }, should_void_authorization: true, should_refund: false };
  }

  private confirmCampaignCapture(params: Row) {
    const campaign = this.getCampaignById(String(params.p_campaign_id));
    if (
      params.p_actor &&
      campaign.business_id !== params.p_actor &&
      campaign.influencer_id !== params.p_actor
    ) {
      throw forbidden('Campaign participant required');
    }
    if (campaign.status !== 'capture_pending' && campaign.status !== 'in_escrow') {
      this.assertIllegalTransition(campaign.status, 'in_escrow');
    }
    const paymentOrder = this.rows('payment_orders').find((row) => row.campaign_id === campaign.id);
    if (!paymentOrder) throw notFound('Payment order');
    paymentOrder.provider_payment_id =
      params.p_provider_payment_id ?? paymentOrder.provider_payment_id;
    paymentOrder.payment_method = params.p_payment_method ?? paymentOrder.payment_method;
    paymentOrder.status = 'captured';
    paymentOrder.captured_at = paymentOrder.captured_at ?? new Date().toISOString();
    campaign.status = 'in_escrow';
    campaign.payment_captured_at = campaign.payment_captured_at ?? new Date().toISOString();
    const ledger = this.rows('escrow_ledger_entries');
    if (
      !ledger.some((row) => row.campaign_id === campaign.id && row.entry_type === 'escrow_lock')
    ) {
      ledger.push({
        id: crypto.randomUUID(),
        campaign_id: campaign.id,
        payment_order_id: paymentOrder.id,
        entry_type: 'escrow_lock',
        amount_paise: Number(campaign.total_charged_paise ?? 0),
        status: 'succeeded',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    return { ...campaign };
  }

  private submitDelivery(params: Row) {
    const campaign = this.getCampaignById(String(params.p_campaign_id));
    if (campaign.influencer_id !== params.p_actor) {
      throw forbidden('Influencer on campaign required');
    }
    if (!['in_escrow', 'changes_requested'].includes(String(campaign.status))) {
      this.assertIllegalTransition(campaign.status, 'delivery_submitted');
    }
    const deliveries = this.rows('deliveries');
    const existing = deliveries.find((row) => row.campaign_id === campaign.id);
    const delivery = existing ?? {
      id: crypto.randomUUID(),
      campaign_id: campaign.id,
      created_at: new Date().toISOString(),
    };
    Object.assign(delivery, {
      submitted_by: params.p_actor,
      storage_path: params.p_storage_path,
      creator_note: params.p_creator_note,
      submitted_at: new Date().toISOString(),
      change_request_note: null,
      changes_requested_at: null,
      updated_at: new Date().toISOString(),
    });
    if (!existing) deliveries.push(delivery);
    campaign.status = 'delivery_submitted';
    campaign.delivery_submitted_at = new Date().toISOString();
    campaign.changes_requested_at = null;
    return { ...campaign };
  }

  private requestDeliveryChanges(params: Row) {
    const campaign = this.getCampaignById(String(params.p_campaign_id));
    if (campaign.business_id !== params.p_actor) {
      throw forbidden('Business on campaign required');
    }
    if (campaign.status !== 'delivery_submitted') {
      this.assertIllegalTransition(campaign.status, 'changes_requested');
    }
    const delivery = this.rows('deliveries').find((row) => row.campaign_id === campaign.id);
    if (!delivery) throw notFound('Delivery');
    delivery.change_request_note = params.p_change_request_note;
    delivery.changes_requested_at = new Date().toISOString();
    campaign.status = 'changes_requested';
    campaign.changes_requested_at = new Date().toISOString();
    return { ...campaign };
  }

  private releaseEscrow(params: Row) {
    const campaign = this.getCampaignById(String(params.p_campaign_id));
    if (!['delivery_submitted', 'completed'].includes(String(campaign.status))) {
      this.assertIllegalTransition(campaign.status, 'completed');
    }
    const paymentOrder = this.rows('payment_orders').find((row) => row.campaign_id === campaign.id);
    if (!paymentOrder || paymentOrder.status !== 'captured') {
      throw conflict(
        'PAYMENT_NOT_CAPTURED',
        'Captured payment order required before escrow release',
      );
    }
    campaign.status = 'completed';
    campaign.completed_at = campaign.completed_at ?? new Date().toISOString();
    const delivery = this.rows('deliveries').find((row) => row.campaign_id === campaign.id);
    if (delivery) {
      delivery.approved_at = delivery.approved_at ?? new Date().toISOString();
      delivery.approved_by = delivery.approved_by ?? params.p_actor;
    }
    const ledger = this.rows('escrow_ledger_entries');
    if (
      !ledger.some(
        (row) => row.campaign_id === campaign.id && row.entry_type === 'payout_influencer',
      )
    ) {
      ledger.push({
        id: crypto.randomUUID(),
        campaign_id: campaign.id,
        payment_order_id: paymentOrder.id,
        entry_type: 'payout_influencer',
        status: 'pending',
        amount_paise: Number(campaign.price_offered_paise ?? 0),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    if (
      !ledger.some((row) => row.campaign_id === campaign.id && row.entry_type === 'platform_fee')
    ) {
      ledger.push({
        id: crypto.randomUUID(),
        campaign_id: campaign.id,
        payment_order_id: paymentOrder.id,
        entry_type: 'platform_fee',
        status: 'succeeded',
        amount_paise: Number(campaign.platform_fee_paise ?? 0),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    return { ...campaign };
  }

  private expireCampaignAuthorization(params: Row) {
    const campaign = this.getCampaignById(String(params.p_campaign_id));
    if (!['pre_authorized', 'capture_pending'].includes(String(campaign.status))) {
      this.assertIllegalTransition(campaign.status, 'expired');
    }
    campaign.status = 'expired';
    campaign.expired_at = new Date().toISOString();
    const paymentOrder = this.rows('payment_orders').find((row) => row.campaign_id === campaign.id);
    if (paymentOrder) {
      paymentOrder.status = 'voided';
      paymentOrder.voided_at = new Date().toISOString();
    }
    return { ...campaign };
  }

  private recordCampaignRefund(params: Row) {
    const campaign = this.getCampaignById(String(params.p_campaign_id));
    const paymentOrder = this.rows('payment_orders').find((row) => row.campaign_id === campaign.id);
    if (!paymentOrder) throw notFound('Payment order');
    campaign.status = 'refunded';
    campaign.refunded_at = campaign.refunded_at ?? new Date().toISOString();
    paymentOrder.status = 'refunded';
    paymentOrder.refunded_at = paymentOrder.refunded_at ?? new Date().toISOString();
    this.rows('escrow_ledger_entries').push({
      id: crypto.randomUUID(),
      campaign_id: campaign.id,
      payment_order_id: paymentOrder.id,
      entry_type: 'refund',
      status: 'succeeded',
      amount_paise: Number(params.p_amount_paise ?? campaign.total_charged_paise ?? 0),
      provider_refund_id: params.p_provider_refund_id,
      metadata: { reason: params.p_reason },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return { ...campaign };
  }

  private inboxSummary(params: Row) {
    const userId = String(params.p_user_id);
    const role = String(params.p_role);
    const key = role === 'business' ? 'business_id' : 'influencer_id';
    const campaigns = this.rows('campaigns').filter((campaign) => campaign[key] === userId);
    const messages = this.rows('campaign_messages');
    const reads = this.rows('campaign_message_reads');
    const result = campaigns.map((campaign) => {
      const campaignMessages = messages.filter((message) => message.campaign_id === campaign.id);
      const latest = [...campaignMessages].sort((a, b) =>
        compareOrderedValues(b.created_at, a.created_at),
      )[0];
      const unreadCount = campaignMessages.filter(
        (message) =>
          message.sender_id !== userId &&
          !reads.some((read) => read.message_id === message.id && read.user_id === userId),
      ).length;
      return {
        campaign: { ...campaign },
        latest_message: latest ? { ...latest } : null,
        unread_count: unreadCount,
      };
    });
    return result.sort((a, b) =>
      compareOrderedValues(
        b.latest_message?.created_at ?? b.campaign.created_at,
        a.latest_message?.created_at ?? a.campaign.created_at,
      ),
    );
  }

  private claimIdempotency(params: Row) {
    const rows = this.rows('idempotency_keys');
    const existing = rows.find((row) => row.key === params.p_key);
    if (existing) {
      return { response: existing.response };
    }
    if (params.p_response == null) {
      return { response: null };
    }
    rows.push({
      key: params.p_key,
      response: params.p_response,
      created_at: new Date().toISOString(),
    });
    return { response: null };
  }
}

function compareOrderedValues(a: unknown, b: unknown) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const aDate = typeof a === 'string' ? Date.parse(a) : Number.NaN;
  const bDate = typeof b === 'string' ? Date.parse(b) : Number.NaN;
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return aDate - bDate;
  return stringifyValue(a).localeCompare(stringifyValue(b));
}

function ilike(value: unknown, pattern: string) {
  const source = stringifyValue(value).toLowerCase();
  const needle = pattern.replaceAll('%', '').replaceAll('\\', '').toLowerCase();
  return source.includes(needle);
}

function stringifyValue(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value.toString();
  }
  try {
    return JSON.stringify(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

function matchesOr(row: Row, expression: string) {
  return expression.split(',').some((part) => {
    const [field, operator, pattern] = part.split('.');
    if (operator !== 'ilike') return false;
    return ilike(row[field], pattern ?? '');
  });
}
