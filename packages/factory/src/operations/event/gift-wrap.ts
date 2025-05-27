import { Rumor, setEncryptedContentCache } from "applesauce-core/helpers";
import {
  EventTemplate,
  finalizeEvent,
  generateSecretKey,
  getEventHash,
  kinds,
  nip44,
  NostrEvent,
  UnsignedEvent,
} from "nostr-tools";
import { EventOperation } from "../../event-factory.js";
import { setEncryptedContent } from "./encryption.js";
import { includeNameValueTag } from "./tags.js";

// Read https://github.com/nostr-protocol/nips/blob/master/59.md#overview for details on rumors and seals
// Gift wrap (signed random key) -> seal (signed sender key) -> rumor (unsigned)

/** Encrypts a seal inside a gift wrap event */
export function setGiftWrapSeal(pubkey: string, seal: NostrEvent | UnsignedEvent | EventTemplate): EventOperation {
  return async (draft, ctx) => {
    if (seal.kind !== kinds.Seal) throw new Error("seal must be a seal event kind");

    // Sign the seal if it is unsigned
    if (!Reflect.has(seal, "sig")) {
      if (!ctx.signer) throw new Error("A signer is required to sign a seal");
      seal = await ctx.signer.signEvent(seal);
    }

    // Return event encrypted with a random key
    const key = generateSecretKey();
    const plaintext = JSON.stringify(seal);
    const giftwrap = finalizeEvent(
      {
        ...draft,
        content: nip44.encrypt(plaintext, nip44.getConversationKey(key, pubkey)),
      },
      key,
    );

    // Save plaintext to cache
    setEncryptedContentCache(giftwrap, plaintext);
    return giftwrap;
  };
}

/** Sets the pubkey that the gift wrap is addressed to */
export function setGiftWrapAddress(pubkey: string) {
  return includeNameValueTag(["p", pubkey]);
}

/** Encrypts a rumor inside a seal */
export function setSealRumor(pubkey: string, rumor: Rumor | UnsignedEvent | EventTemplate): EventOperation {
  return async (draft, ctx) => {
    if (draft.kind !== kinds.Seal) throw new Error("Can only set rumor on a seal");

    // Ensure rumor has pubkey
    if (!Reflect.has(rumor, "pubkey")) {
      if (!ctx.signer) throw new Error("A signer is required to set a rumor on a seal");
      rumor = { ...rumor, pubkey: await ctx.signer.getPublicKey() };
    }

    // Ensure rumor has id
    if (!Reflect.has(rumor, "id")) rumor = { ...rumor, id: getEventHash(rumor as UnsignedEvent) };

    // Ensure rumor does not have signature
    Reflect.deleteProperty(rumor, "sig");

    return await setEncryptedContent(pubkey, JSON.stringify(rumor))(draft, ctx);
  };
}
