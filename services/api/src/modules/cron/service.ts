import type { PaymentProvider } from '../../clients/providers.js';
import type { DataStore } from '../../repositories/data-store.js';
import { HOUR_MS, nowIso, type Row } from '../../services/shared.js';
import { NotificationService } from '../notifications/service.js';
import { PaymentService } from '../payments/service.js';

const DAY_MS = 24 * HOUR_MS;

export class CronService {
  constructor(
    private readonly store: DataStore,
    private readonly notifications: NotificationService,
    private readonly payments: PaymentService,
    private readonly payment?: PaymentProvider,
  ) {}

  async autoRelease() {
    let autoReleased = 0;
    let expired = 0;
    const cutoff = new Date(Date.now() - 7 * DAY_MS).toISOString();
    const deliverySubmitted = await this.store.list<Row>('campaigns', {
      eq: { status: 'delivery_submitted' },
      lt: { delivery_submitted_at: cutoff },
    });
    for (const campaign of deliverySubmitted) {
      await this.payments.releaseEscrow(undefined, campaign.id, false);
      await this.notifications.createForMany(
        [campaign.business_id, campaign.influencer_id],
        'booking_completed',
        { campaignId: campaign.id },
      );
      autoReleased += 1;
    }
    for (const status of ['pre_authorized', 'capture_pending'] as const) {
      const rows = await this.store.list<Row>('campaigns', {
        eq: { status },
        lt: { expires_at: nowIso() },
      });
      for (const campaign of rows) {
        await this.store.rpc<Row>('expire_campaign_authorization', { p_campaign_id: campaign.id });
        const recipients = [campaign.business_id, campaign.influencer_id];
        await this.notifications.createForMany(recipients, 'booking_expired', {
          campaignId: campaign.id,
        });
        expired += 1;
      }
    }
    return { autoReleased, expired };
  }
}
