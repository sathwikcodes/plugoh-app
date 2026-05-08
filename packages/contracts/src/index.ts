import { z } from "zod";

export const USER_ROLES = ["business", "influencer"] as const;
export const INFLUENCER_CATEGORIES = [
  "Food",
  "Fitness",
  "Beauty",
  "Lifestyle",
  "Travel",
  "Education",
  "Tech",
  "Fashion",
  "Other",
] as const;
export const BUSINESS_TYPES = [
  "Restaurant/Cafe",
  "D2C Brand",
  "Local Business",
  "E-commerce",
  "SaaS/Tech",
  "Agency",
  "Personal Brand",
  "Other",
] as const;
export const PACKAGE_TYPES = ["reel", "post", "story", "reel+story", "reel+post"] as const;
export const BOOKING_OBJECTIVES = [
  "visit_place",
  "feature_product",
  "showcase_service",
  "promote_offer",
  "brand_shoutout",
] as const;
export const TURNAROUND_TIMES = ["24_hours", "2_3_days", "1_week", "2_weeks"] as const;
export const LANGUAGES = [
  "English",
  "Hindi",
  "Telugu",
  "Tamil",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Punjabi",
  "Urdu",
  "Other",
] as const;
export const CONTENT_TYPES = [
  "Product Reviews",
  "Tutorials",
  "Vlogs",
  "Reels/Shorts",
  "Stories",
  "Unboxing",
  "Recipe",
  "Before/After",
  "Day in Life",
  "Brand Integration",
] as const;
export const CAMPAIGN_STATUSES = [
  "requested",
  "payment_pending",
  "pre_authorized",
  "in_escrow",
  "delivery_submitted",
  "completed",
  "disputed",
  "declined",
  "expired",
  "cancelled",
  "refunded",
] as const;
export const PAYMENT_STATUSES = ["unpaid", "authorized", "paid"] as const;
export const PAYMENT_METHODS = ["card", "upi", "other"] as const;
export const NOTIFICATION_TYPES = [
  "new_booking",
  "booking_accepted",
  "payment_confirmed",
  "payment_secured",
  "delivery_submitted",
  "booking_completed",
  "booking_rejected",
  "booking_expired",
  "delivery_disputed",
] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Influencer {
  id: string;
  user_id: string;
  display_name?: string;
  ig_username?: string;
  instagram_handle?: string;
  bio?: string;
  city?: string;
  category?: string;
  follower_count?: number;
  avg_likes_per_reel?: number;
  price_per_reel?: number;
  price_per_post?: number;
  price_per_story?: number;
  starterPrice?: number | null;
  is_active?: boolean;
}

export interface HealthResponse {
  service: string;
  status: "ok";
}

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta: { requestId: string };
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: { requestId: string };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

const uuid = z.string().uuid();
const numeric = z.coerce.number().finite();
const optionalText = z.string().trim().min(1).optional();

export const roleSchema = z.enum(USER_ROLES);
export const idParamSchema = z.object({ id: uuid });

export const influencerListQuerySchema = z.object({
  search: z.string().optional(),
  place: z.string().optional(),
  category: z.string().optional(),
  price_min: numeric.optional(),
  price_max: numeric.optional(),
  sort: z
    .enum(["followers_desc", "engagement_asc", "engagement_desc", "price_asc", "price_desc"])
    .optional(),
});

export const influencerProfilePatchSchema = z.object({
  display_name: optionalText,
  bio: optionalText,
  city: optionalText,
  category: z.enum(INFLUENCER_CATEGORIES).optional(),
  languages: z.array(z.enum(LANGUAGES)).optional(),
  turnaround_time: z.enum(TURNAROUND_TIMES).optional(),
  content_types: z.array(z.enum(CONTENT_TYPES)).optional(),
});

export const influencerPricingPatchSchema = z.object({
  price_per_reel: numeric.optional(),
  price_per_post: numeric.optional(),
  price_per_story: numeric.optional(),
});

export const influencerActivePatchSchema = z.object({
  is_active: z.boolean(),
});

export const payoutUpsertSchema = z
  .object({
    upi_id: optionalText,
    bank_account_no: optionalText,
    bank_ifsc: optionalText,
    bank_account_name: optionalText,
    preferred_method: z.enum(["upi", "bank"]).default("upi"),
  })
  .refine((value) => value.upi_id || (value.bank_account_no && value.bank_ifsc && value.bank_account_name), {
    message: "Provide UPI ID or complete bank details",
  });

export const businessProfilePatchSchema = z.object({
  brand_name: optionalText,
  brand_type: z.enum(BUSINESS_TYPES).optional(),
  brand_location: optionalText,
  brand_summary: optionalText,
  tagline: optionalText,
});

export const createCampaignSchema = z
  .object({
    influencer_id: uuid,
    influencer_profile_id: uuid,
    package_type: z.enum(["reel", "post", "story"]),
    price_offered: numeric.positive(),
    objective: z.enum(BOOKING_OBJECTIVES),
    timing_mode: z.enum(["asap", "choose_date"]),
    due_date: z.string().date().optional(),
    event_name: optionalText,
    contact_email: z.string().email(),
    contact_phone: z.string().min(5),
  })
  .refine((value) => value.timing_mode !== "choose_date" || value.due_date, {
    path: ["due_date"],
    message: "due_date is required when timing_mode is choose_date",
  })
  .refine((value) => value.objective !== "visit_place" || value.event_name, {
    path: ["event_name"],
    message: "event_name is required when objective is visit_place",
  });

export const campaignListQuerySchema = z.object({
  role: roleSchema,
});

export const disputeSchema = z.object({
  reason: z.string().trim().min(1),
});

export const createEscrowOrderSchema = z.object({
  campaign_id: uuid,
});

export const verifyEscrowSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  campaign_id: uuid,
});

export const createBookingOrderSchema = z.object({
  price_offered: numeric.positive(),
  influencer_profile_id: uuid,
});

export const verifyBookingPaymentSchema = createCampaignSchema.extend({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export const campaignIdSchema = z.object({
  campaign_id: uuid,
});

export const deliverySubmitSchema = z.object({
  storagePath: z.string().trim().min(1),
  notes: z.string().optional(),
});

export const messageCreateSchema = z.object({
  content: z.string().trim().min(1),
  message_type: z.literal("text").default("text"),
});

export const notificationsReadSchema = z
  .object({
    ids: z.array(uuid).optional(),
    all: z.boolean().optional(),
  })
  .refine((value) => value.all || (value.ids && value.ids.length > 0), {
    message: "Provide ids or all=true",
  });

export const requestCallSchema = z.object({
  campaignId: uuid,
});

export const instagramConnectQuerySchema = z.object({
  userId: uuid,
  role: roleSchema,
});

export const instagramCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export const aiGenerateSchema = z.object({
  userId: uuid,
});

export type InfluencerListQuery = z.infer<typeof influencerListQuerySchema>;
export type InfluencerProfilePatch = z.infer<typeof influencerProfilePatchSchema>;
export type InfluencerPricingPatch = z.infer<typeof influencerPricingPatchSchema>;
export type InfluencerActivePatch = z.infer<typeof influencerActivePatchSchema>;
export type PayoutUpsert = z.infer<typeof payoutUpsertSchema>;
export type BusinessProfilePatch = z.infer<typeof businessProfilePatchSchema>;
export type CreateCampaignRequest = z.infer<typeof createCampaignSchema>;
export type CampaignListQuery = z.infer<typeof campaignListQuerySchema>;
export type DisputeRequest = z.infer<typeof disputeSchema>;
export type CreateEscrowOrderRequest = z.infer<typeof createEscrowOrderSchema>;
export type VerifyEscrowRequest = z.infer<typeof verifyEscrowSchema>;
export type CreateBookingOrderRequest = z.infer<typeof createBookingOrderSchema>;
export type VerifyBookingPaymentRequest = z.infer<typeof verifyBookingPaymentSchema>;
export type CampaignIdRequest = z.infer<typeof campaignIdSchema>;
export type DeliverySubmitRequest = z.infer<typeof deliverySubmitSchema>;
export type MessageCreateRequest = z.infer<typeof messageCreateSchema>;
export type NotificationsReadRequest = z.infer<typeof notificationsReadSchema>;
export type RequestCallRequest = z.infer<typeof requestCallSchema>;
export type InstagramConnectQuery = z.infer<typeof instagramConnectQuerySchema>;
export type InstagramCallbackQuery = z.infer<typeof instagramCallbackQuerySchema>;
export type AiGenerateRequest = z.infer<typeof aiGenerateSchema>;
