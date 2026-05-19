import { readEnv, type EnvConfig } from '../config/env.js';
import { SupabaseDataStore } from '../repositories/data-store.js';
import { createServices } from '../services/marketplace.js';
import { createDefaultProviders } from '../modules/runtime.js';
import type { AuthUser } from '../types.js';

type Args = Record<string, string | undefined>;
type Row = Record<string, unknown>;

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

function valueOrDefault(value: unknown, fallback: string) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : fallback;
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

async function ensureBusinessProfile(store: SupabaseDataStore, businessId: string, args: Args) {
  const brandName =
    args['brand-name']?.trim() ??
    args['business-name']?.trim() ??
    args['event-name']?.trim() ??
    'Plugoh Test Brand';
  const brandType = args['brand-type']?.trim() ?? 'Restaurant/Cafe';
  const brandLocation = args['brand-location']?.trim() ?? args.location?.trim() ?? 'Hyderabad';
  const brandSummary =
    args['brand-summary']?.trim() ??
    `${brandName} is using Plugoh to book creator-led campaign content.`;
  const tagline = args.tagline?.trim() ?? 'Creator-led campaigns, escrow-backed payouts.';
  const existing = await store.findOne<Row>('business_profiles', { eq: { user_id: businessId } });

  if (!existing) {
    await store.insert('business_profiles', {
      user_id: businessId,
      brand_name: brandName,
      brand_type: brandType,
      brand_location: brandLocation,
      brand_summary: brandSummary,
      tagline,
    });
    return;
  }

  const patch = {
    brand_name: valueOrDefault(existing.brand_name, brandName),
    brand_type: valueOrDefault(existing.brand_type, brandType),
    brand_location: valueOrDefault(existing.brand_location, brandLocation),
    brand_summary: valueOrDefault(existing.brand_summary, brandSummary),
    tagline: valueOrDefault(existing.tagline, tagline),
  };
  await store.update('business_profiles', { eq: { user_id: businessId } }, patch);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = readEnv();
  assertCreativeEnv(config);
  const store = new SupabaseDataStore(config);
  const providers = createDefaultProviders(config);
  delete providers.push;
  const services = createServices(store, providers, config);
  const businessId = required(args, 'business-id');
  const influencerId = required(args, 'influencer-id');
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
      package_type: args['package-type'] ?? 'reel',
      objective: args.objective ?? 'feature_product',
      timing_mode: args['timing-mode'] ?? 'asap',
      due_date: args['due-date'],
      event_name: args['event-name'],
      contact_email: args['contact-email'] ?? 'ops@plugoh.app',
      contact_phone: args['contact-phone'] ?? '+910000000000',
    },
    {},
    { skipCreative: true },
  );
  const campaign = await services.campaigns.generateCreative(created.campaignId);
  process.stdout.write(
    `${JSON.stringify(
      {
        campaignId: created.campaignId,
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
