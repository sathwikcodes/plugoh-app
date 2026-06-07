import type { CampaignMessage } from '@plugoh/contracts';
import { useMemo } from 'react';

export type ReadReceipt = {
  /** The viewer's most recent message id (where a "Seen" label may appear). */
  lastOwnMessageId: string | null;
  /** Whether the counterparty has read that last own message. */
  lastOwnIsRead: boolean;
};

/**
 * Single-pass read-receipt computation over an oldest-first message list.
 * Replaces three cascading useMemos: finds the viewer's newest message and the
 * counterparty, then checks the counterparty against that message's `read_by`.
 */
export function useReadReceipt(messages: CampaignMessage[], myId: string): ReadReceipt {
  return useMemo(() => {
    let lastOwn: CampaignMessage | null = null;
    let otherUserId: string | null = null;
    for (const message of messages) {
      if (message.sender_id === myId) {
        lastOwn = message; // oldest-first → ends on the newest own message
      } else if (!otherUserId) {
        otherUserId = message.sender_id;
      }
    }
    const lastOwnIsRead = Boolean(
      lastOwn && otherUserId && (lastOwn.read_by ?? []).includes(otherUserId),
    );
    return { lastOwnMessageId: lastOwn?.id ?? null, lastOwnIsRead };
  }, [messages, myId]);
}
