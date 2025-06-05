import { LegacyMessageBlueprint, LegacyMessageReplyBlueprint } from "applesauce-factory/blueprints";
import { Action } from "../action-hub.js";
import { kinds, NostrEvent } from "nostr-tools";

/** Sends a legacy NIP-04 message to a recipient */
export function SendLegacyMessage(recipient: string, message: string): Action {
  return async function* ({ factory }) {
    const draft = await factory.create(LegacyMessageBlueprint, recipient, message);

    // Return the signed message
    yield await factory.sign(draft);
  };
}

/** Send a reply to a legacy message */
export function ReplyToLegacyMessage(parent: NostrEvent, message: string): Action {
  return async function* ({ factory }) {
    if (parent.kind !== kinds.EncryptedDirectMessage)
      throw new Error("Legacy messages can only reply to other legacy messages");
    const draft = await factory.create(LegacyMessageReplyBlueprint, parent, message);

    // Return the signed message
    yield await factory.sign(draft);
  };
}
