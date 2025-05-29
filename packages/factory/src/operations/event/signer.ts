import { EventTemplate, NostrEvent, UnsignedEvent } from "nostr-tools";
import { EventOperation } from "../../types.js";

/**
 * An operation that adds the signers pubkey to the event
 * @throws {Error} if no signer is provided
 */
export function stampPubkey(): EventOperation<EventTemplate, UnsignedEvent> {
  return async (draft, ctx) => {
    if (!ctx.signer) throw new Error("No signer provided");
    const pubkey = await ctx.signer.getPublicKey();
    return { ...draft, pubkey };
  };
}

/**
 * An operation that signs the event
 * @throws {Error} if no signer is provided
 */
export function signEvent(): EventOperation<EventTemplate | UnsignedEvent, NostrEvent> {
  return async (draft, ctx) => {
    if (!ctx.signer) throw new Error("No signer provided");
    return ctx.signer.signEvent(draft);
  };
}
