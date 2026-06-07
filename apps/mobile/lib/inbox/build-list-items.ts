import type { CampaignMessage } from '@plugoh/contracts';

export type ListItem =
  | { kind: 'message'; data: CampaignMessage; key: string }
  | { kind: 'separator'; date: string; key: string };

/**
 * Turn an oldest-first message array into a newest-first list (for an inverted
 * list) with a date separator inserted ahead of each new calendar day.
 */
export function buildListItems(messages: CampaignMessage[]): ListItem[] {
  const result: ListItem[] = [];
  let lastDateStr = '';
  for (const message of messages) {
    const dateStr = new Date(message.created_at).toDateString();
    if (dateStr !== lastDateStr) {
      result.push({ kind: 'separator', date: message.created_at, key: `sep-${message.id}` });
      lastDateStr = dateStr;
    }
    result.push({ kind: 'message', data: message, key: message.id });
  }
  return result.reverse();
}

function isSameSenderBubble(item: ListItem | undefined, sender: string): boolean {
  return (
    !!item &&
    item.kind === 'message' &&
    item.data.sender_id === sender &&
    item.data.message_type !== 'system' &&
    item.data.message_type !== 'booking_card'
  );
}

/**
 * Instagram-style corner grouping for an inverted list: index-1 renders visually
 * below (newer), index+1 above (older). A run of same-sender bubbles keeps round
 * outer corners and tight inner ones; the group end is where the avatar shows.
 */
export function getMessageGroupFlags(
  items: ListItem[],
  index: number,
  sender: string,
): { isGroupStart: boolean; isGroupEnd: boolean } {
  return {
    isGroupEnd: !isSameSenderBubble(items[index - 1], sender),
    isGroupStart: !isSameSenderBubble(items[index + 1], sender),
  };
}
