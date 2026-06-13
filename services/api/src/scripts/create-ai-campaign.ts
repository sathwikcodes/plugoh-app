import { createClient } from '@supabase/supabase-js';
import { readEnv, type EnvConfig } from '../config/env.js';
import { SupabaseDataStore } from '../repositories/data-store.js';
import { createServices } from '../services/marketplace.js';
import { createDefaultProviders } from '../modules/runtime.js';
import type { AuthUser } from '../types.js';

type Args = Record<string, string | undefined>;

const DEMO_BUSINESS_EMAIL = 'campaign-demo-brand@plugoh.dev';
const DEMO_BUSINESS_PASSWORD = 'Plugoh-demo-campaign-12345!';
const DEMO_BRAND = {
  name: 'Blue Tokai Coffee Roasters',
  category: 'restaurant_cafe',
  location: 'Indiranagar, Bengaluru',
  summary:
    'Blue Tokai Coffee Roasters is a specialty coffee brand known for fresh roasts, cafe-led experiences, and modern Indian coffee culture.',
  tagline: 'Freshly roasted Indian coffee for everyday rituals.',
  ownerName: 'Plugoh Demo Brand Owner',
  phone: '+919876543210',
  profileImageUrl:
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop',
};

function parseArgs(argv: string[]) {
  const args: Args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item?.startsWith('--')) continue;
    const key = item.slice(2);
    const value = argv[i + 1]?.startsWith('--') ? undefined : argv[i + 1];
    args[key] = value ?? 'true';
    if (value) i += 1;
  }
  return args;
}

function required(args: Args, key: string) {
  const value = args[key]?.trim();
  if (!value) throw new Error(`Missing --${key}`);
  return value;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

function assertCreativeEnv(config: EnvConfig) {
  const missing: string[] = [];
  if (config.aiProvider !== 'azure_openai') missing.push('AI_PROVIDER=azure_openai');
  if (!config.azureOpenAiEndpoint) missing.push('AZURE_OPENAI_ENDPOINT');
  if (!config.azureOpenAiApiKey) missing.push('AZURE_OPENAI_API_KEY');
  if (!config.azureOpenAiChatDeployment) missing.push('AZURE_OPENAI_CHAT_DEPLOYMENT');
  if (config.azureImageProvider === 'mai') {
    if (!config.azureMaiEndpoint) missing.push('AZURE_MAI_ENDPOINT');
    if (!config.azureMaiApiKey && !config.azureOpenAiApiKey) missing.push('AZURE_MAI_API_KEY');
    if (!config.azureMaiImageDeployment && !config.azureOpenAiImageDeployment) {
      missing.push('AZURE_MAI_IMAGE_DEPLOYMENT');
    }
  } else if (!config.azureOpenAiImageDeployment) {
    missing.push('AZURE_OPENAI_IMAGE_DEPLOYMENT');
  }
  if (missing.length > 0) {
    throw new Error(
      [
        'Campaign creative env is incomplete. Add these to repo .env.local or services/api/.env.local:',
        ...missing.map((name) => `- ${name}`),
      ].join('\n'),
    );
  }
}

function getSupabaseAdminCredentials(config: EnvConfig) {
  const { supabaseUrl, supabaseServiceRoleKey } = config;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push('SUPABASE_URL');
    if (!supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

    throw new Error(
      [
        'Supabase env is incomplete. Add these to repo .env.local or services/api/.env.local:',
        ...missing.map((name) => `- ${name}`),
      ].join('\n'),
    );
  }

  return { supabaseUrl, supabaseServiceRoleKey };
}

async function findAuthUserIdByEmail(config: EnvConfig, email: string) {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseAdminCredentials(config);
  const client = createClient(supabaseUrl, supabaseServiceRoleKey);

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user.id;
    if (data.users.length < 1000) break;
  }

  return null;
}

async function createDemoBusinessUser(config: EnvConfig, args: Args) {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseAdminCredentials(config);
  const email = args['business-email']?.trim().toLowerCase() || DEMO_BUSINESS_EMAIL;
  const existingUserId = await findAuthUserIdByEmail(config, email);
  if (existingUserId) return existingUserId;

  const client = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data, error } = await client.auth.admin.createUser({
    email,
    password: args['business-password']?.trim() || DEMO_BUSINESS_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: args['owner-name']?.trim() || DEMO_BRAND.ownerName,
      role: 'business',
      source: 'create-ai-campaign-script',
    },
  });
  if (error) throw error;
  if (!data.user.id) throw new Error(`Could not create demo business user for ${email}`);
  return data.user.id;
}

async function ensureBusinessProfile(store: SupabaseDataStore, businessId: string, args: Args) {
  const brandName = args['brand-name']?.trim() ?? args['business-name']?.trim() ?? DEMO_BRAND.name;
  const brandCategory = args['brand-category']?.trim() ?? DEMO_BRAND.category;
  const brandLocation =
    args['brand-location']?.trim() ?? args.location?.trim() ?? DEMO_BRAND.location;
  const brandSummary = args['brand-summary']?.trim() ?? DEMO_BRAND.summary;
  const tagline = args.tagline?.trim() ?? DEMO_BRAND.tagline;
  const commonProfile = {
    id: businessId,
    email: args['business-email']?.trim().toLowerCase() || DEMO_BUSINESS_EMAIL,
    full_name: args['owner-name']?.trim() || DEMO_BRAND.ownerName,
    phone: args['contact-phone']?.trim() || DEMO_BRAND.phone,
    location: brandLocation,
    avatar_url: args['owner-avatar-url']?.trim() || DEMO_BRAND.profileImageUrl,
    updated_at: new Date().toISOString(),
  };

  await store.upsert('profiles', commonProfile, 'id');
  await store.upsert('user_roles', { user_id: businessId, role: 'business' }, 'user_id');
  await store.upsert(
    'business_profiles',
    {
      user_id: businessId,
      brand_name: brandName,
      brand_category: brandCategory,
      brand_location: brandLocation,
      brand_summary: brandSummary,
      tagline,
      instagram_username: args['brand-instagram']?.trim() || 'bluetokaicoffee',
      instagram_profile_picture_url: args['brand-avatar-url']?.trim() || DEMO_BRAND.profileImageUrl,
      instagram_followers_count: Number(args['brand-followers'] ?? 142000),
      instagram_connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    'user_id',
  );
}

function printUsage() {
  process.stdout.write(`Create a real service-backed AI campaign for an existing influencer.

Usage:
  npm run create:ai-campaign -- --influencer-id <uuid>

Options:
  --influencer-id <uuid>           Required. Existing influencer user UUID.
  --influencer-profile-id <uuid>   Optional. Defaults to that user's active profile.
  --business-id <uuid>             Optional. Existing business user UUID.
  --business-email <email>         Optional. Demo auth user email if --business-id is omitted.
  --brand-name <name>              Optional. Defaults to ${DEMO_BRAND.name}.
  --brand-category <category>      Optional. Defaults to ${DEMO_BRAND.category}.
  --brand-location <location>      Optional. Defaults to ${DEMO_BRAND.location}.
  --package-type <type>            Optional. Defaults to instagram_reel.
  --objective <objective>          Optional. Defaults to feature_product.
  --timing-mode <asap|choose_date> Optional. Defaults to asap.
  --due-date <YYYY-MM-DD>          Optional. Required only for choose_date.

Example:
  npm run create:ai-campaign -- --influencer-id 22222222-2222-4222-8222-222222222222
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printUsage();
    return;
  }

  const config = readEnv();
  assertCreativeEnv(config);
  getSupabaseAdminCredentials(config);
  const store = new SupabaseDataStore(config);
  const providers = createDefaultProviders(config);
  delete providers.push;
  const services = createServices(store, providers, config);
  const influencerId = required(args, 'influencer-id');
  const businessId = args['business-id']?.trim() || (await createDemoBusinessUser(config, args));
  let influencerProfileId = args['influencer-profile-id']?.trim();

  if (!influencerProfileId) {
    const influencer = await store.findOne<{ id: string }>('influencer_profiles', {
      eq: { user_id: influencerId, is_active: true },
    });
    if (!influencer) throw new Error(`No active influencer profile found for ${influencerId}`);
    influencerProfileId = influencer.id;
  }

  await ensureBusinessProfile(store, businessId, args);

  const user: AuthUser = { id: businessId };
  const created = await services.campaigns.create(
    user,
    {
      influencer_profile_id: influencerProfileId,
      influencer_id: influencerId,
      package_type: args['package-type'] ?? 'instagram_reel',
      objective: args.objective ?? 'feature_product',
      timing_mode: args['timing-mode'] ?? 'asap',
      due_date: args['due-date'],
      place_name: args['place-name'] ?? args['event-name'],
      business_contact_email: args['contact-email'] ?? 'ops@plugoh.app',
      business_contact_phone: args['contact-phone'] ?? '+910000000000',
    },
    {},
    { skipCreative: true },
  );
  const campaign = await services.campaigns.generateCreative(created.campaignId);
  process.stdout.write(
    `${JSON.stringify(
      {
        campaignId: created.campaignId,
        businessId,
        influencerId,
        influencerProfileId,
        status: campaign.status,
        expiresAt: campaign.expires_at,
        title: campaign.ai_title ?? campaign.title,
        cardImageUrl: campaign.card_image_url,
        creativeStatus: campaign.creative_status,
        creativeError: campaign.creative_error,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${errorMessage(error)}\n`);
  process.exitCode = 1;
});
