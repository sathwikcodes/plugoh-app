import {
  ExternalAiProvider,
  GoogleGeocodingProvider,
  GoogleWeatherProvider,
  MetaInstagramProvider,
  RazorpayProvider,
  ResendEmailProvider,
  SupabaseStorageProvider,
} from '../clients/providers.js';
import { readEnv, type EnvConfig } from '../config/env.js';
import { SupabaseDataStore } from '../repositories/data-store.js';
import { createServices, type ProviderBundle } from '../services/marketplace.js';

function createDefaultProviders(config: EnvConfig): ProviderBundle {
  const providers: ProviderBundle = {};
  if (config.razorpayKeyId && config.razorpayKeySecret)
    providers.payment = new RazorpayProvider(config);
  if (config.resendApiKey) providers.email = new ResendEmailProvider(config);
  if (config.googleMapsGeocodingApiKey) providers.geocoding = new GoogleGeocodingProvider(config);
  if (config.googleMapsWeatherApiKey) providers.weather = new GoogleWeatherProvider(config);
  if (config.instagramClientId && config.instagramAppSecret && config.instagramRedirectUri) {
    providers.instagram = new MetaInstagramProvider(config);
  }
  if (config.supabaseUrl && config.supabaseServiceRoleKey)
    providers.storage = new SupabaseStorageProvider(config);
  providers.ai = new ExternalAiProvider(config);
  return providers;
}

export async function runAutoRelease() {
  const config = readEnv();
  const store = new SupabaseDataStore(config);
  const providers = createDefaultProviders(config);
  const services = createServices(store, providers, config);
  return services.cron.autoRelease();
}
