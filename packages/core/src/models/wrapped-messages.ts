import { kinds } from "nostr-tools";
import { map } from "rxjs";

import { Model } from "../event-store/interface.js";
import { getGiftWrapRumor, Rumor } from "../helpers/gift-wraps.js";
import {
  createConversationIdentifier,
  getConversationIdentifierFromMessage,
  getConversationParticipants,
  getWrappedMessageParent,
} from "../helpers/wrapped-messages.js";
import { watchEventsUpdates } from "../observable/watch-event-updates.js";

/**
 * A model that returns all wrapped messages for a pubkey
 * @param self - The pubkey of the user
 */
export function WrappedMessagesModel(self: string): Model<Rumor[]> {
  return (store) =>
    store.timeline({ kinds: [kinds.GiftWrap], "#p": [self] }).pipe(
      // Watch for updates to the gift wraps
      watchEventsUpdates(store),
      // Get rumors and filter out locked
      map((rumors) =>
        rumors
          .map((gift) => getGiftWrapRumor(gift))
          .filter((e) => !!e)
          .sort((a, b) => b.created_at - a.created_at),
      ),
    );
}

/**
 * A model that returns all wrapped direct messages in a conversation
 * @param self - The pubkey of the user
 * @param participants - A conversation identifier or a list of participant pubkeys
 */
export function WrappedMessagesConversation(self: string, participants: string | string[]): Model<Rumor[]> {
  // Get the conversation identifier include the users pubkey
  const identifier = createConversationIdentifier([
    self,
    ...(typeof participants === "string" ? getConversationParticipants(participants) : participants),
  ]);

  return (store) =>
    store.model(WrappedMessagesModel, self).pipe(
      // Only select direct messages for this conversation
      map((rumors) =>
        rumors.filter(
          (rumor) =>
            rumor.kind === kinds.PrivateDirectMessage &&
            // Only select message for this conversation (the identifier from the message will include "self")
            getConversationIdentifierFromMessage(rumor) === identifier,
        ),
      ),
    );
}

/**
 * Returns an array of root wrapped messages that have replies
 * @param self - The pubkey of the user
 * @param conversation - The conversation identifier
 */
export function WrappedMessageThreads(self: string, conversation: string): Model<Rumor[]> {
  return (store) =>
    store.model(WrappedMessagesConversation, self, conversation).pipe(
      // Filter down messages to only include root messages that have replies
      map((rumors) =>
        rumors.filter(
          (rumor) =>
            // Only select root messages
            !getWrappedMessageParent(rumor) &&
            // Check if message has any replies
            rumors.some((r) => getWrappedMessageParent(r) === rumor.id),
        ),
      ),
    );
}

/**
 * A model that returns all the gift wrapped direct messages that are replies to a given message
 * @param self - The pubkey of the user
 * @param message - The message to get the replies for
 */
export function WrappedMessageReplies(self: string, message: Rumor): Model<Rumor[]> {
  const conversation = getConversationIdentifierFromMessage(message);

  return (store) =>
    store.model(WrappedMessagesConversation, self, conversation).pipe(
      // Only select replies to this message
      map((rumors) => rumors.filter((rumor) => getWrappedMessageParent(rumor) === message.id)),
    );
}
