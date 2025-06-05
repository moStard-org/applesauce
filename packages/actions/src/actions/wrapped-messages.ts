import { getConversationParticipants, Rumor } from "applesauce-core/helpers";
import {
  GiftWrapBlueprint,
  WrappedMessageBlueprint,
  WrappedMessageBlueprintOptions,
  WrappedMessageReplyBlueprint,
} from "applesauce-factory/blueprints";

import { Action } from "../action-hub.js";

/**
 * Sends a NIP-17 wrapped message to a conversation
 * @param participants - A conversation identifier, user pubkey, or a list of participant pubkeys
 * @param message - The message to send
 * @returns Signed gift wrapped messages to send
 */
export function SendWrappedMessage(
  participants: string | string[],
  message: string,
  opts?: WrappedMessageBlueprintOptions,
): Action {
  return async function* ({ factory }) {
    const rumor = await factory.create(WrappedMessageBlueprint, participants, message, opts);

    // Get the pubkeys to send this message to (will include the sender)
    const pubkeys = getConversationParticipants(rumor);
    for (const pubkey of pubkeys) {
      yield await factory.create(GiftWrapBlueprint, pubkey, rumor);
    }
  };
}

/**
 * Sends a NIP-17 reply to a wrapped message
 * @param parent - The parent wrapped message
 * @param message - The message to send
 * @returns Signed gift wrapped messages to send
 */
export function ReplyToWrappedMessage(parent: Rumor, message: string, opts?: WrappedMessageBlueprintOptions): Action {
  return async function* ({ factory }) {
    // Create the reply message
    const rumor = await factory.create(WrappedMessageReplyBlueprint, parent, message, opts);

    // Get the pubkeys to send this message to (will include the sender)
    const pubkeys = getConversationParticipants(parent);
    for (const pubkey of pubkeys) {
      yield await factory.create(GiftWrapBlueprint, pubkey, rumor);
    }
  };
}
