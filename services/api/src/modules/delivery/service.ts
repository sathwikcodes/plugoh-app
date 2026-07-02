import type { StorageProvider } from '../../clients/providers.js';
import { badRequest, notFound } from '../../core/errors.js';
import type { DataStore } from '../../repositories/data-store.js';
import type { AuthUser } from '../../types.js';
import {
  campaignForParticipant,
  HOUR_MS,
  requireCampaignRole,
  requireStatus,
  type Row,
} from '../../services/shared.js';
import { NotificationService } from '../notifications/service.js';

export class DeliveryService {
  constructor(
    private readonly store: DataStore,
    private readonly notifications: NotificationService,
    private readonly storage?: StorageProvider,
  ) {}

  async upload(user: AuthUser, campaignId: string, file: File) {
    const campaign = await requireCampaignRole(this.store, campaignId, user.id, 'influencer');
    requireStatus(campaign, ['in_escrow', 'changes_requested']);
    if (file.size > 50 * 1024 * 1024)
      throw badRequest('FILE_TOO_LARGE', 'Delivery files must be 50 MB or smaller');
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'application/pdf',
      'application/zip',
    ];
    if (!allowed.includes(file.type))
      throw badRequest('UNSUPPORTED_FILE_TYPE', 'Unsupported delivery file type');
    if (!this.storage)
      throw badRequest('STORAGE_PROVIDER_UNAVAILABLE', 'Storage provider is not configured');
    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `${campaignId}/${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const storagePath = await this.storage.uploadDelivery({ path, file });
    return { storage_path: storagePath };
  }

  async submit(user: AuthUser, id: string, input: Row) {
    const campaign = await this.store.rpc<Row>('submit_delivery', {
      p_campaign_id: id,
      p_actor: user.id,
      p_storage_path: input.storage_path,
      p_creator_note: input.creator_note ?? null,
    });
    await this.notifications.create(campaign.business_id, 'delivery_submitted', {
      campaignId: id,
      campaignTitle: campaign.title,
    });
    return { ok: true };
  }

  async signedUrl(user: AuthUser, id: string) {
    await campaignForParticipant(this.store, id, user.id);
    const delivery = await this.store.findOne<Row>('deliveries', { eq: { campaign_id: id } });
    if (!delivery) throw notFound('Delivery');
    if (!this.storage)
      throw badRequest('STORAGE_PROVIDER_UNAVAILABLE', 'Storage provider is not configured');
    const signedUrl = await this.storage.signedUrl(delivery.storage_path, 3600);
    return { signedUrl, expiresAt: new Date(Date.now() + HOUR_MS).toISOString() };
  }
}
