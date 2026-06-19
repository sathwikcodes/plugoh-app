import type { UserRole } from '@plugoh/contracts';
import type { EmailProvider, StorageProvider } from '../../clients/providers.js';
import { badRequest, tooManyRequests } from '../../core/errors.js';
import type { DataStore } from '../../repositories/data-store.js';
import type { AuthUser } from '../../types.js';
import {
  campaignForParticipant,
  HOUR_MS,
  nowIso,
  requireStatus,
  withBusinessProfileImage,
  withInfluencerProfileImage,
  type Row,
} from '../../services/shared.js';

const MAX_MESSAGE_ATTACHMENT_SIZE = 25 * 1024 * 1024;
const MESSAGE_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
  'text/plain',
]);

export class MessagingService {
  constructor(
    private readonly store: DataStore,
    private readonly email?: EmailProvider,
    private readonly storage?: StorageProvider,
  ) {}

  async inbox(user: AuthUser, role: UserRole) {
    // One aggregate query returns each campaign's latest message + unread count,
    // already ordered newest-activity-first (see the inbox_summary RPC migration).
    const summary = (await this.store.rpc('inbox_summary', {
      p_user_id: user.id,
      p_role: role,
    })) as unknown as Array<{
      campaign: Row;
      latest_message: Row | null;
      unread_count: number | string;
    }>;
    const campaigns = summary.map((entry) => entry.campaign);
    const businessIds = [
      ...new Set(campaigns.map((campaign) => campaign.business_id).filter(Boolean)),
    ];
    const influencerIds = [
      ...new Set(campaigns.map((campaign) => campaign.influencer_id).filter(Boolean)),
    ];
    const [businessProfiles, businessAccounts, influencerProfiles, influencerAccounts] =
      await Promise.all([
        businessIds.length
          ? this.store.list<Row>('business_profiles', { in: { user_id: businessIds } })
          : [],
        businessIds.length ? this.store.list<Row>('profiles', { in: { id: businessIds } }) : [],
        influencerIds.length
          ? this.store.list<Row>('influencer_profiles', { in: { user_id: influencerIds } })
          : [],
        influencerIds.length ? this.store.list<Row>('profiles', { in: { id: influencerIds } }) : [],
      ]);
    const businessByUserId = new Map(businessProfiles.map((profile) => [profile.user_id, profile]));
    const accountByUserId = new Map(businessAccounts.map((account) => [account.id, account]));
    const influencerByUserId = new Map(
      influencerProfiles.map((profile) => [profile.user_id, profile]),
    );
    const influencerAccountByUserId = new Map(
      influencerAccounts.map((account) => [account.id, account]),
    );
    return summary.map((entry) => ({
      campaign: {
        ...entry.campaign,
        business_profile: withBusinessProfileImage(
          businessByUserId.get(entry.campaign.business_id),
          accountByUserId.get(entry.campaign.business_id),
        ),
        influencer_profile: withInfluencerProfileImage(
          influencerByUserId.get(entry.campaign.influencer_id),
          influencerAccountByUserId.get(entry.campaign.influencer_id),
        ),
      },
      latestMessage: entry.latest_message,
      unreadCount: Number(entry.unread_count),
    }));
  }

  async messages(user: AuthUser, id: string, options: { limit?: number; before?: string } = {}) {
    await campaignForParticipant(this.store, id, user.id);
    const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
    // Newest-first window; fetch one extra row to detect whether older messages remain.
    const page = await this.store.list<Row>('campaign_messages', {
      eq: { campaign_id: id },
      ...(options.before ? { lt: { created_at: options.before } } : {}),
      order: { column: 'created_at', ascending: false },
      limit: limit + 1,
    });
    const hasMore = page.length > limit;
    const windowed = hasMore ? page.slice(0, limit) : page;
    const nextCursor = hasMore ? String(windowed[windowed.length - 1]?.created_at) : null;
    const messageIds = windowed.map((message) => String(message.id)).filter(Boolean);
    // Fetch ALL reads (not just this user's) so `read_by` reflects the counterparty too.
    const reads = messageIds.length
      ? await this.store.list<Row>('campaign_message_reads', { in: { message_id: messageIds } })
      : [];
    const readBy = new Map<string, string[]>();
    const ownReadAt = new Map<string, string>();
    for (const read of reads) {
      const messageId = String(read.message_id);
      const readers = readBy.get(messageId) ?? [];
      readers.push(String(read.user_id));
      readBy.set(messageId, readers);
      if (read.user_id === user.id) ownReadAt.set(messageId, String(read.read_at));
    }
    const messages = windowed.map((message) => ({
      ...message,
      read_by: readBy.get(String(message.id)) ?? [],
      read_at: ownReadAt.get(String(message.id)) ?? null,
    }));
    return { messages, nextCursor };
  }

  async send(user: AuthUser, id: string, input: Row) {
    const campaign = await campaignForParticipant(this.store, id, user.id);
    requireStatus(campaign, ['in_escrow', 'delivery_submitted', 'changes_requested', 'completed']);
    const message = await this.store.insert<Row>('campaign_messages', {
      campaign_id: id,
      sender_id: user.id,
      message_type: input.message_type,
      content: input.content,
      metadata: {},
      created_at: nowIso(),
    });
    await this.store.upsert(
      'campaign_message_reads',
      { message_id: message.id, user_id: user.id, read_at: nowIso() },
      'message_id,user_id',
    );
    return message;
  }

  async sendAttachment(user: AuthUser, id: string, input: { caption?: string; file: File }) {
    const campaign = await campaignForParticipant(this.store, id, user.id);
    requireStatus(campaign, ['in_escrow', 'delivery_submitted', 'changes_requested', 'completed']);
    if (!this.storage)
      throw badRequest('STORAGE_PROVIDER_UNAVAILABLE', 'Storage provider is not configured');
    if (input.file.size > MAX_MESSAGE_ATTACHMENT_SIZE) {
      throw badRequest('FILE_TOO_LARGE', 'Message attachments must be 25 MB or smaller');
    }
    if (!MESSAGE_ATTACHMENT_MIME_TYPES.has(input.file.type)) {
      throw badRequest('UNSUPPORTED_FILE_TYPE', 'Unsupported message attachment file type');
    }
    const ext = input.file.name.split('.').pop() ?? 'bin';
    const path = `messages/${id}/${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const storagePath = await this.storage.uploadMessageAttachment({ path, file: input.file });
    const message = await this.store.insert<Row>('campaign_messages', {
      campaign_id: id,
      sender_id: user.id,
      message_type: 'attachment',
      content: input.caption?.trim() || input.file.name,
      metadata: {
        storage_path: storagePath,
        fileName: input.file.name,
        mimeType: input.file.type,
        fileSize: input.file.size,
      },
      created_at: nowIso(),
    });
    await this.store.upsert(
      'campaign_message_reads',
      { message_id: message.id, user_id: user.id, read_at: nowIso() },
      'message_id,user_id',
    );
    await this.store.insert('campaign_files', {
      campaign_id: id,
      message_id: message.id,
      uploaded_by: user.id,
      file_type: 'message_attachment',
      storage_bucket: 'campaign-messages',
      storage_path: storagePath,
      file_name: input.file.name,
      file_size: input.file.size,
      mime_type: input.file.type,
      created_at: nowIso(),
    });
    return message;
  }

  async markRead(user: AuthUser, id: string) {
    await campaignForParticipant(this.store, id, user.id);
    // Only the counterparty's messages need a read record for this user.
    const messages = await this.store.list<Row>('campaign_messages', {
      eq: { campaign_id: id },
    });
    const counterpartyMessageIds = messages
      .filter((message) => message.sender_id !== user.id)
      .map((message) => String(message.id));
    if (counterpartyMessageIds.length === 0) return { ok: true, marked: 0 };
    // Skip messages this user has already read so a re-open is a no-op write.
    const existingReads = await this.store.list<Row>('campaign_message_reads', {
      eq: { user_id: user.id },
      in: { message_id: counterpartyMessageIds },
    });
    const alreadyRead = new Set(existingReads.map((read) => String(read.message_id)));
    const unread = counterpartyMessageIds.filter((messageId) => !alreadyRead.has(messageId));
    if (unread.length === 0) return { ok: true, marked: 0 };
    const readAt = nowIso();
    await this.store.upsertMany(
      'campaign_message_reads',
      unread.map((messageId) => ({ message_id: messageId, user_id: user.id, read_at: readAt })),
      'message_id,user_id',
    );
    return { ok: true, marked: unread.length };
  }

  async requestCall(user: AuthUser, campaignId: string) {
    const campaign = await campaignForParticipant(this.store, campaignId, user.id);
    requireStatus(campaign, ['in_escrow', 'delivery_submitted', 'changes_requested', 'completed']);
    const recent = await this.store.findOne<Row>('campaign_messages', {
      eq: {
        campaign_id: campaignId,
        sender_id: user.id,
        message_type: 'system',
        content: 'call_requested',
      },
    });
    if (recent && Date.parse(recent.created_at) > Date.now() - 6 * HOUR_MS)
      throw tooManyRequests('Call already requested in the last 6 hours');
    const message = await this.store.insert<Row>('campaign_messages', {
      campaign_id: campaignId,
      sender_id: user.id,
      message_type: 'system',
      content: 'call_requested',
      metadata: {},
      created_at: nowIso(),
    });
    await this.store.upsert(
      'campaign_message_reads',
      { message_id: message.id, user_id: user.id, read_at: nowIso() },
      'message_id,user_id',
    );
    if (this.email) {
      const otherUserId =
        campaign.business_id === user.id ? campaign.influencer_id : campaign.business_id;
      const profile = await this.store.findOne<Row>('profiles', { eq: { id: otherUserId } });
      if (profile?.email)
        await this.email.sendCallRequest({
          to: profile.email,
          subject: 'Plugoh call request',
          html: `<p>A call was requested for ${campaign.title}.</p>`,
        });
    }
    return { ok: true };
  }
}
