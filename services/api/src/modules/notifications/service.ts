import type { NotificationType } from '@plugoh/contracts';
import type { PushProvider } from '../../clients/providers.js';
import { logger } from '../../core/logger.js';
import type { DataStore } from '../../repositories/data-store.js';
import type { AuthUser } from '../../types.js';
import { nowIso, type Row } from '../../services/shared.js';

export class NotificationService {
  constructor(
    private readonly store: DataStore,
    private readonly push?: PushProvider,
  ) {}

  async list(user: AuthUser) {
    return this.store.list<Row>('notifications', {
      eq: { user_id: user.id },
      order: { column: 'created_at', ascending: false },
    });
  }

  async markRead(user: AuthUser, input: { ids?: string[] | undefined; all?: boolean | undefined }) {
    const options = input.all
      ? { eq: { user_id: user.id } }
      : { eq: { user_id: user.id }, in: { id: input.ids ?? [] } };
    await this.store.update('notifications', options, { read: true });
    return { ok: true };
  }

  async create(userId: string, type: NotificationType, data: Row = {}) {
    await this.store.insert('notifications', {
      user_id: userId,
      type,
      data,
      read: false,
      created_at: nowIso(),
    });
    await this.sendPush(userId, type, data);
  }

  async createForMany(userIds: string[], type: NotificationType, data: Row = {}) {
    await Promise.all(userIds.map((userId) => this.create(userId, type, data)));
  }

  async registerPush(user: AuthUser, input: { expo_push_token: string; platform: string }) {
    return this.store.upsert(
      'user_push_tokens',
      {
        user_id: user.id,
        expo_push_token: input.expo_push_token,
        platform: input.platform,
        updated_at: nowIso(),
      },
      'user_id',
    );
  }

  async unregisterPush(user: AuthUser) {
    await this.store.update(
      'user_push_tokens',
      { eq: { user_id: user.id } },
      { expo_push_token: null, updated_at: nowIso() },
    );
    return { ok: true };
  }

  private async sendPush(userId: string, type: NotificationType, data: Row) {
    if (!this.push) return;
    const tokens = await this.store.list<Row>('user_push_tokens', {
      eq: { user_id: userId },
    });
    const activeTokens = tokens
      .map((row) => row.expo_push_token)
      .filter((value): value is string => typeof value === 'string' && value.length > 0);
    if (activeTokens.length === 0) return;
    try {
      const result = await this.push.send(
        activeTokens.map((to) => ({
          to,
          title: notificationTitle(type),
          body: notificationBody(type, data),
          data: { type, ...data },
        })),
      );
      if (result.failed > 0) {
        logger.warn(
          { userId, type, failed: result.failed, errors: result.errors },
          'Push notifications had delivery failures',
        );
      } else {
        logger.info({ userId, type, sent: result.sent }, 'Push notifications delivered');
      }
    } catch (error) {
      logger.error({ err: error, userId, type }, 'Push provider send failed');
    }
  }
}

function notificationTitle(type: NotificationType) {
  switch (type) {
    case 'new_booking':
      return 'New campaign request';
    case 'booking_accepted':
      return 'Campaign accepted';
    case 'payment_secured':
      return 'Payment secured';
    case 'delivery_submitted':
      return 'Delivery submitted';
    case 'booking_completed':
      return 'Campaign completed';
    case 'booking_declined':
      return 'Campaign declined';
    case 'booking_expired':
      return 'Campaign expired';
    case 'changes_requested':
      return 'Changes requested';
    default:
      return 'Plugoh update';
  }
}

function notificationBody(type: NotificationType, data: Row) {
  const title = String(data.campaignTitle ?? 'campaign');
  switch (type) {
    case 'new_booking':
      return `${title} needs your response.`;
    case 'payment_secured':
      return `${title} is funded and ready to execute.`;
    case 'delivery_submitted':
      return `${title} is waiting for approval.`;
    case 'booking_completed':
      return `${title} has been completed.`;
    case 'changes_requested':
      return `${title} needs revisions.`;
    default:
      return `${title} has a new update.`;
  }
}
