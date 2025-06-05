import { kinds, NostrEvent } from "nostr-tools";
import { blueprint } from "../event-factory.js";
import { setEncryptedContent } from "../operations/event/encryption.js";
import { includeLegacyMessageAddressTag, includeLegacyMessageParentTag } from "../operations/event/legacy-message.js";

/** A blueprint to create a nip-04 encrypted direct message */
export function LegacyMessageBlueprint(recipient: string, message: string) {
  return blueprint(
    kinds.EncryptedDirectMessage,
    // Encrypt the contents of the message to the recipient
    setEncryptedContent(recipient, message),
    // Include the nessiary "p" tag of the recipient
    includeLegacyMessageAddressTag(recipient),
  );
}

/** Creates a reply to a legacy message */
export function LegacyMessageReplyBlueprint(parent: NostrEvent, message: string) {
  return blueprint(
    kinds.EncryptedDirectMessage,
    // Encrypt the contents of the message to the recipient
    setEncryptedContent(parent.pubkey, message),
    // Include the nessiary "p" tag of the recipient
    includeLegacyMessageAddressTag(parent.pubkey),
    // Include the parent message id
    includeLegacyMessageParentTag(parent),
  );
}
