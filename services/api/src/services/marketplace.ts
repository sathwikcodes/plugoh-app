import type {
  AiProvider,
  EmailProvider,
  GeocodingProvider,
  InstagramProvider,
  PaymentProvider,
  PlacesProvider,
  PushProvider,
  StorageProvider,
  WeatherProvider,
} from '../clients/providers.js';
import type { EnvConfig } from '../config/env.js';
import type { DataStore } from '../repositories/data-store.js';
import { AiProfileService } from '../modules/ai/service.js';
import { CampaignService } from '../modules/campaigns/service.js';
import { CronService } from '../modules/cron/service.js';
import { DeliveryService } from '../modules/delivery/service.js';
import { DiscoveryService } from '../modules/discovery/service.js';
import { EarningsService } from '../modules/earnings/service.js';
import { InstagramService } from '../modules/instagram/service.js';
import { MessagingService } from '../modules/messaging/service.js';
import { NotificationService } from '../modules/notifications/service.js';
import { PaymentService } from '../modules/payments/service.js';
import { ProfileService } from '../modules/profiles/service.js';

export type Services = {
  discovery: DiscoveryService;
  profiles: ProfileService;
  campaigns: CampaignService;
  payments: PaymentService;
  delivery: DeliveryService;
  messaging: MessagingService;
  notifications: NotificationService;
  instagram: InstagramService;
  ai: AiProfileService;
  earnings: EarningsService;
  cron: CronService;
};

export type ProviderBundle = {
  payment?: PaymentProvider;
  email?: EmailProvider;
  geocoding?: GeocodingProvider;
  places?: PlacesProvider;
  weather?: WeatherProvider;
  instagram?: InstagramProvider;
  storage?: StorageProvider;
  ai?: AiProvider;
  push?: PushProvider;
};

export function createServices(
  store: DataStore,
  providers: ProviderBundle,
  config: EnvConfig,
): Services {
  const notifications = new NotificationService(store, providers.push);
  const campaignCore = new CampaignService(
    store,
    notifications,
    providers.payment,
    providers.storage,
    providers.ai,
    providers.geocoding,
    providers.weather,
  );
  const payments = new PaymentService(
    store,
    notifications,
    campaignCore,
    config,
    providers.payment,
  );
  return {
    discovery: new DiscoveryService(store),
    profiles: new ProfileService(store, providers.geocoding, providers.places),
    campaigns: campaignCore,
    payments,
    delivery: new DeliveryService(store, notifications, providers.storage),
    messaging: new MessagingService(store, providers.email, providers.storage),
    notifications,
    instagram: new InstagramService(store, providers.instagram),
    ai: new AiProfileService(store, providers.ai),
    earnings: new EarningsService(store),
    cron: new CronService(store, notifications, payments, providers.payment),
  };
}
