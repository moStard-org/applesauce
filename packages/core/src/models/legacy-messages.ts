import { kinds, NostrEvent } from "nostr-tools";
import { Model } from "../event-store/interface.js";
import { getLegacyMessageCorraspondant, getLegacyMessageParent } from "../helpers/legacy-messages.js";
import { map } from "rxjs";
import { getConversationIdentifierFromMessage, getConversationParticipants } from "../helpers/messages.js";

/** A model that returns all legacy message groups (1-1) that a pubkey is participating in */
export function LegacyMessagesGroups(
  self: string,
): Model<{ id: string; participants: string[]; lastMessage: NostrEvent }[]> {
  return (store) =>
    store.timeline({ kinds: [kinds.EncryptedDirectMessage], "#p": [self] }).pipe(
      map((messages) => {
        const groups: Record<string, NostrEvent> = {};
        for (const message of messages) {
          const id = getConversationIdentifierFromMessage(message);
          if (!groups[id] || groups[id].created_at < message.created_at) groups[id] = message;
        }

        return Object.values(groups).map((message) => ({
          id: getConversationIdentifierFromMessage(message),
          participants: getConversationParticipants(message),
          lastMessage: message,
        }));
      }),
    );
}

/** Returns all legacy direct messages in a group */
export function LegacyMessagesGroup(self: string, corraspondant: string): Model<NostrEvent[]> {
  return (store) =>
    store.timeline({
      kinds: [kinds.EncryptedDirectMessage],
      "#p": [self, corraspondant],
      authors: [self, corraspondant],
    });
}

/** Returns an array of legacy messages that have replies */
export function LegacyMessageThreads(self: string, corraspondant: string): Model<NostrEvent[]> {
  return (store) =>
    store.model(LegacyMessagesGroup, self, corraspondant).pipe(
      map((messages) =>
        messages.filter(
          (message) =>
            // Only select messages that are not replies
            !getLegacyMessageParent(message) &&
            // Check if message has any replies
            store.getByFilters({ "#e": [message.id], kinds: [kinds.EncryptedDirectMessage] }).size > 0,
        ),
      ),
    );
}

/** Returns all the legacy direct messages that are replies to a given message */
export function LegacyMessageReplies(self: string, message: NostrEvent): Model<NostrEvent[]> {
  const corraspondant = getLegacyMessageCorraspondant(message, self);

  return (store) =>
    store.timeline({
      kinds: [kinds.EncryptedDirectMessage],
      "#p": [self, corraspondant],
      authors: [self, corraspondant],
      "#e": [message.id],
    });
}
