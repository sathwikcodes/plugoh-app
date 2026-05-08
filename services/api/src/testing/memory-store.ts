import crypto from 'node:crypto';
import type { DataStore, QueryOptions } from "../repositories/data-store.js";
import { conflict, forbidden, notFound } from "../core/errors.js";

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

  async list<T extends Row>(table: string, options: QueryOptions = {}, _select = "*") {
    return this.applyOptions(this.rows(table), options).map((row) => ({ ...row })) as T[];
  }

  async getById<T extends Row>(table: string, id: string, _select = "*") {
    const row = this.rows(table).find((item) => item.id === id);
    return row ? ({ ...row } as T) : null;
  }

  async findOne<T extends Row>(table: string, options: QueryOptions, _select = "*") {
    const row = this.applyOptions(this.rows(table), options)[0];
    return row ? ({ ...row } as T) : null;
  }

  async insert<T extends Row>(table: string, values: Row, _select = "*") {
    const row = { id: values.id ?? crypto.randomUUID(), ...values };
    this.rows(table).push(row);
    return { ...row } as unknown as T;
  }

  async update<T extends Row>(table: string, options: QueryOptions, values: Row, _select = "*") {
    const rows = this.applyOptions(this.rows(table), options);
    for (const row of rows) Object.assign(row, values);
    return rows.map((row) => ({ ...row })) as T[];
  }

  async upsert<T extends Row>(table: string, values: Row, onConflict = "id", _select = "*") {
    const keys = onConflict.split(",").map((key) => key.trim());
    const rows = this.rows(table);
    const existing = rows.find((row) => keys.every((key) => row[key] === values[key]));
    if (existing) {
      Object.assign(existing, values);
      return { ...existing } as T;
    }
    return this.insert<T>(table, values);
  }

  async rpc<T extends Row>(fnName: string, params: Row) {
    switch (fnName) {
      case "accept_campaign":
        return this.acceptCampaign(params) as T;
      case "decline_campaign":
        return this.declineCampaign(params) as T;
      case "verify_escrow":
        return this.verifyEscrow(params) as T;
      case "submit_delivery":
        return this.submitDelivery(params) as T;
      case "approve_delivery":
        return this.approveDelivery(params) as T;
      case "release_escrow":
        return this.releaseEscrow(params) as T;
      case "claim_idempotency":
        return this.claimIdempotency(params) as T;
      default:
        throw new Error(`Unsupported RPC in MemoryDataStore: ${fnName}`);
    }
  }

  private rows(table: string) {
    if (!this.tables.has(table)) this.tables.set(table, []);
    return this.tables.get(table)!;
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
      result = [...result].sort((a, b) => compareOrderedValues(a[options.order!.column], b[options.order!.column]) * direction);
    }
    if (options.limit) result = result.slice(0, options.limit);
    return result;
  }

  private getCampaignById(campaignId: string) {
    const campaign = this.rows("campaigns").find((row) => row.id === campaignId);
    if (!campaign) throw notFound("Campaign");
    return campaign;
  }

  private assertIllegalTransition(from: unknown, to: string): never {
    throw conflict("ILLEGAL_TRANSITION", `illegal_transition:${String(from)}->${to}`);
  }

  private acceptCampaign(params: Row) {
    const campaign = this.getCampaignById(String(params.p_campaign_id));
    if (campaign.influencer_id !== params.p_actor) {
      throw forbidden("Influencer on campaign required");
    }
    if (!["requested", "payment_pending", "pre_authorized"].includes(String(campaign.status))) {
      this.assertIllegalTransition(campaign.status, "accepted");
    }
    if (campaign.status === "pre_authorized") {
      campaign.status = "in_escrow";
      campaign.payment_status = "paid";
      campaign.accepted_at = new Date().toISOString();
      campaign.payment_captured_at = new Date().toISOString();
      const txRows = this.rows("escrow_transactions");
      if (!txRows.some((row) => row.campaign_id === campaign.id && row.type === "escrow_lock")) {
        txRows.push({
          id: crypto.randomUUID(),
          campaign_id: campaign.id,
          type: "escrow_lock",
          amount_paise: Number(campaign.total_charged_amount ?? 0) * 100,
          platform_fee_paise: Number(campaign.platform_fee_amount ?? 0) * 100,
          razorpay_order_id: campaign.razorpay_order_id,
          razorpay_payment_id: campaign.razorpay_payment_id,
          status: "success",
          created_at: new Date().toISOString(),
        });
      }
    } else {
      campaign.status = "payment_pending";
      campaign.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      campaign.accepted_at = new Date().toISOString();
    }
    return { ...campaign };
  }

  private declineCampaign(params: Row) {
    const campaign = this.getCampaignById(String(params.p_campaign_id));
    if (campaign.influencer_id !== params.p_actor) {
      throw forbidden("Influencer on campaign required");
    }
    if (!["requested", "payment_pending", "pre_authorized"].includes(String(campaign.status))) {
      this.assertIllegalTransition(campaign.status, "declined");
    }
    const shouldRefund = campaign.status === "pre_authorized" && campaign.payment_method === "upi" && Boolean(campaign.razorpay_payment_id);
    campaign.status = "declined";
    return { campaign, campaign_id: campaign.id, should_refund: shouldRefund };
  }

  private verifyEscrow(params: Row) {
    const campaign = this.getCampaignById(String(params.p_campaign_id));
    if (campaign.business_id !== params.p_actor) {
      throw forbidden("Business on campaign required");
    }
    if (campaign.status !== "payment_pending" && !(campaign.status === "in_escrow" && campaign.razorpay_payment_id === params.p_payment_id)) {
      this.assertIllegalTransition(campaign.status, "in_escrow");
    }
    if (campaign.status !== "in_escrow" || campaign.razorpay_payment_id !== params.p_payment_id) {
      campaign.status = "in_escrow";
      campaign.payment_status = "paid";
      campaign.payment_method = params.p_method;
      campaign.razorpay_payment_id = params.p_payment_id;
      campaign.payment_captured_at = new Date().toISOString();
      const txRows = this.rows("escrow_transactions");
      if (!txRows.some((row) => row.campaign_id === campaign.id && row.type === "escrow_lock" && row.razorpay_payment_id === params.p_payment_id)) {
        txRows.push({
          id: crypto.randomUUID(),
          campaign_id: campaign.id,
          type: "escrow_lock",
          amount_paise: Number(campaign.total_charged_amount ?? 0) * 100,
          platform_fee_paise: Number(campaign.platform_fee_amount ?? 0) * 100,
          razorpay_order_id: campaign.razorpay_order_id,
          razorpay_payment_id: params.p_payment_id,
          status: "success",
          created_at: new Date().toISOString(),
        });
      }
    }
    return { ...campaign };
  }

  private submitDelivery(params: Row) {
    const campaign = this.getCampaignById(String(params.p_campaign_id));
    if (campaign.influencer_id !== params.p_actor) {
      throw forbidden("Influencer on campaign required");
    }
    if (campaign.status !== "in_escrow") {
      this.assertIllegalTransition(campaign.status, "delivery_submitted");
    }
    const deliveries = this.rows("deliveries");
    if (deliveries.some((row) => row.campaign_id === campaign.id)) {
      throw conflict("DELIVERY_ALREADY_SUBMITTED", "Delivery has already been submitted for this campaign");
    }
    deliveries.push({
      id: crypto.randomUUID(),
      campaign_id: campaign.id,
      submitted_by: params.p_actor,
      content_url: params.p_storage_path,
      notes: params.p_notes,
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    campaign.status = "delivery_submitted";
    campaign.delivery_submitted_at = new Date().toISOString();
    return { ...campaign };
  }

  private approveDelivery(params: Row) {
    const campaign = this.getCampaignById(String(params.p_campaign_id));
    if (campaign.business_id !== params.p_actor) {
      throw forbidden("Business on campaign required");
    }
    if (campaign.status !== "delivery_submitted") {
      this.assertIllegalTransition(campaign.status, "completed");
    }
    campaign.status = "completed";
    campaign.completed_at = new Date().toISOString();
    const delivery = this.rows("deliveries").find((row) => row.campaign_id === campaign.id);
    if (delivery) {
      delivery.approved_at = new Date().toISOString();
      delivery.approved_by = params.p_actor;
    }
    return { ...campaign };
  }

  private releaseEscrow(params: Row) {
    const campaign = this.getCampaignById(String(params.p_campaign_id));
    if (!["delivery_submitted", "completed"].includes(String(campaign.status))) {
      this.assertIllegalTransition(campaign.status, "completed");
    }
    campaign.status = "completed";
    campaign.completed_at = campaign.completed_at ?? new Date().toISOString();
    return { ...campaign };
  }

  private claimIdempotency(params: Row) {
    const rows = this.rows("idempotency_keys");
    const existing = rows.find((row) => row.key === params.p_key);
    if (existing) {
      return { response: existing.response };
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
  if (typeof a === "number" && typeof b === "number") return a - b;
  const aDate = typeof a === "string" ? Date.parse(a) : Number.NaN;
  const bDate = typeof b === "string" ? Date.parse(b) : Number.NaN;
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return aDate - bDate;
  return String(a ?? "").localeCompare(String(b ?? ""));
}

function ilike(value: unknown, pattern: string) {
  const source = String(value ?? "").toLowerCase();
  const needle = pattern.replaceAll("%", "").replaceAll("\\", "").toLowerCase();
  return source.includes(needle);
}

function matchesOr(row: Row, expression: string) {
  return expression.split(",").some((part) => {
    const [field, operator, pattern] = part.split(".");
    if (operator !== "ilike") return false;
    return ilike(row[field], pattern ?? "");
  });
}
