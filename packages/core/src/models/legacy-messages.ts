import { kinds, NostrEvent } from "nostr-tools";
import { Model } from "../event-store/interface.js";
import { getLegacyMessageCorraspondant, getLegacyMessageParent } from "../helpers/legacy-messages.js";
import { map } from "rxjs";

/** Returns all legacy direct messages in a conversation */
export function LegacyMessagesConversation(self: string, corraspondant: string): Model<NostrEvent[]> {
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
    store.model(LegacyMessagesConversation, self, corraspondant).pipe(
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
