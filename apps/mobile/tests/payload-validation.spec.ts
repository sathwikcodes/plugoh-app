import {
  deliverySubmitSchema,
  influencerProfilePatchSchema,
  payoutUpsertSchema,
} from '@plugoh/contracts';
import { describe, expect, it } from 'vitest';
import { compactPayload } from '@/lib/api/payload';

describe('compactPayload', () => {
  it('drops blank strings, null, and undefined but keeps real values', () => {
    expect(
      compactPayload({
        display_name: 'Aditi',
        bio: '',
        city: '   ',
        follower_count: 0,
        is_active: false,
        missing: undefined,
        cleared: null,
      }),
    ).toEqual({ display_name: 'Aditi', follower_count: 0, is_active: false });
  });
});

describe('mobile payloads satisfy contract validation after compaction', () => {
  it('influencer profile patch: raw empty optional strings fail, compacted passes', () => {
    const raw = { display_name: 'Aditi', bio: '', city: '' };
    expect(influencerProfilePatchSchema.safeParse(raw).success).toBe(false);
    expect(influencerProfilePatchSchema.safeParse(compactPayload(raw)).success).toBe(true);
  });

  it('payout (UPI): stripping empty bank fields satisfies the refine', () => {
    const raw = {
      preferred_method: 'upi' as const,
      upi_id: 'aditi@upi',
      bank_account_no: '',
      bank_ifsc: '',
      bank_account_name: '',
    };
    expect(payoutUpsertSchema.safeParse(raw).success).toBe(false);
    expect(payoutUpsertSchema.safeParse(compactPayload(raw)).success).toBe(true);
  });

  it('payout (bank): complete details pass after compaction', () => {
    const raw = {
      preferred_method: 'bank' as const,
      upi_id: '',
      bank_account_no: '000111222333',
      bank_ifsc: 'HDFC0000123',
      bank_account_name: 'Aditi Rao',
    };
    expect(payoutUpsertSchema.safeParse(compactPayload(raw)).success).toBe(true);
  });
});

describe('delivery submit payload matches contract field names', () => {
  it('accepts { storage_path, creator_note } and treats creator_note as optional', () => {
    expect(
      deliverySubmitSchema.safeParse({
        storage_path: 'deliveries/c1/file.mp4',
        creator_note: 'Done!',
      }).success,
    ).toBe(true);
    expect(deliverySubmitSchema.safeParse({ storage_path: 'deliveries/c1/file.mp4' }).success).toBe(
      true,
    );
    // The pre-fix camelCase shape must fail so we never regress.
    expect(
      deliverySubmitSchema.safeParse({ storagePath: 'deliveries/c1/file.mp4', notes: 'x' }).success,
    ).toBe(false);
  });
});
