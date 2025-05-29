import { kinds } from "nostr-tools";
import { EventFactory } from "../event-factory.js";
import { setEncryptedContent } from "../operations/event/encryption.js";
import { includeLegacyDirectMessageAddressTag } from "../operations/event/message.js";
import { EventBlueprint } from "../types.js";

/** A blueprint to create a nip-04 encrypted direct message */
export function LegacyDirectMessageBlueprint(pubkey: string, message: string): EventBlueprint {
  return (ctx) =>
    EventFactory.runProcess(
      { kind: kinds.EncryptedDirectMessage },
      ctx,
      setEncryptedContent(pubkey, message),
      includeLegacyDirectMessageAddressTag(pubkey),
    );
}
