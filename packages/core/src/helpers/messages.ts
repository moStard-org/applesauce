import { NostrEvent } from "nostr-tools";

/**
 * Groups messages into bubble sets based on the pubkey and time
 *
 * @param messages - The messages to group
 * @param buffer - Minimum number of seconds between message groups
 * @returns The grouped messages
 */
export function groupMessageEvents(messages: NostrEvent[], buffer = 5 * 60): NostrEvent[][] {
  const groups: NostrEvent[][] = [];

  for (const message of messages) {
    const group = groups[groups.length - 1];
    const last = group?.[0];

    if (group && last?.pubkey === message.pubkey && Math.abs(message.created_at - last.created_at) < buffer)
      group.push(message);
    else groups.push([message]);
  }

  return groups;
}
