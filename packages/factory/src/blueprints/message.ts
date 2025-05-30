import { kinds } from "nostr-tools";
import { blueprint } from "../event-factory.js";
import { setEncryptedContent } from "../operations/event/encryption.js";
import { includeLegacyDirectMessageAddressTag } from "../operations/event/message.js";

/** A blueprint to create a nip-04 encrypted direct message */
export function LegacyDirectMessageBlueprint(pubkey: string, message: string) {
  return blueprint(
    kinds.EncryptedDirectMessage,
    setEncryptedContent(pubkey, message),
    includeLegacyDirectMessageAddressTag(pubkey),
  );
}
