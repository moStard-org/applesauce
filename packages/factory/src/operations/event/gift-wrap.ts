import { Rumor, unixNow } from "applesauce-core/helpers";
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
import { build } from "../../event-factory.js";
import { eventPipe } from "../../helpers/pipeline.js";
import { EventOperation } from "../../types.js";
import { setEncryptedContent } from "./encryption.js";
import { stamp } from "./signer.js";

// Read https://github.com/nostr-protocol/nips/blob/master/59.md#overview for details on rumors and seals
// Gift wrap (signed random key) -> seal (signed sender key) -> rumor (unsigned)

/** Create a timestamp with a random offset of an hour */
function randomNow() {
  return unixNow() - Math.floor(Math.random() * 60 * 60);
}

/** Converts an event to a rumor. The first operation in the gift wrap pipeline */
export function toRumor(): EventOperation<EventTemplate | UnsignedEvent | NostrEvent, Rumor> {
  return async (draft, ctx) => {
    // @ts-expect-error
    const rumor: Rumor = { ...draft };

    // Ensure rumor has pubkey
    if (!Reflect.has(rumor, "pubkey")) {
      if (!ctx.signer) throw new Error("A signer is required to create a rumor");
      rumor.pubkey = await ctx.signer.getPublicKey();
    }

    // Ensure rumor has id
    if (!Reflect.has(rumor, "id")) rumor.id = getEventHash(rumor as UnsignedEvent);

    // Ensure rumor does not have signature
    Reflect.deleteProperty(rumor, "sig");

    return rumor;
  };
}

/** Seals a rumor in a NIP-59 seal. The second operation in the gift wrap pipeline */
export function sealRumor(pubkey: string): EventOperation<Rumor, NostrEvent> {
  return async (rumor, ctx) => {
    if (!ctx.signer) throw new Error("A signer is required to create a seal");

    const unsigned = await build(
      { kind: kinds.Seal, created_at: randomNow() },
      ctx,
      setEncryptedContent(pubkey, JSON.stringify(rumor)),
      stamp(),
    );
    return await ctx.signer.signEvent(unsigned);
  };
}

/** Gift wraps a seal to a pubkey. The third operation in the gift wrap pipeline */
export function wrapSeal(pubkey: string): EventOperation<NostrEvent, NostrEvent> {
  return async (seal) => {
    const key = generateSecretKey();
    const plaintext = JSON.stringify(seal);

    return finalizeEvent(
      {
        kind: kinds.GiftWrap,
        created_at: randomNow(),
        content: nip44.encrypt(plaintext, nip44.getConversationKey(key, pubkey)),
        tags: [["p", pubkey]],
      },
      key,
    );
  };
}

/** An operation that gift wraps an event to a pubkey */
export function giftWrap(pubkey: string): EventOperation<EventTemplate | UnsignedEvent | NostrEvent, NostrEvent> {
  return eventPipe(
    toRumor(),
    /** @ts-expect-error */
    sealRumor(pubkey),
    wrapSeal(pubkey),
  ) as EventOperation<EventTemplate | UnsignedEvent | NostrEvent, NostrEvent>;
}
