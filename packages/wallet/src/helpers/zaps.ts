import { Proof } from "@cashu/cashu-ts";
import { getOrComputeCachedValue, processTags, safeParse } from "applesauce-core/helpers";
import { NostrEvent } from "nostr-tools";
import { getHistoryRedeemed } from "./history.js";

export const NUTZAP_KIND = 9321;

// Symbols for caching computed values
export const NutzapProofsSymbol = Symbol.for("nutzap-proofs");
export const NutzapAmountSymbol = Symbol.for("nutzap-amount");

/** Returns the cashu proofs from a kind:9321 nutzap event */
export function getNutzapProofs(event: NostrEvent): Proof[] {
  return getOrComputeCachedValue(event, NutzapProofsSymbol, () => {
    return processTags(event.tags, (tag) => (tag[0] === "proof" ? safeParse(tag[1]) : undefined));
  });
}

/** Returns the mint URL from a kind:9321 nutzap event */
export function getNutzapMint(event: NostrEvent): string | undefined {
  return event.tags.find((t) => t[0] === "u")?.[1];
}

/** Returns the recipient pubkey from a kind:9321 nutzap event */
export function getNutzapRecipient(event: NostrEvent): string | undefined {
  return event.tags.find((t) => t[0] === "p")?.[1];
}

/** Returns the event ID being nutzapped from a kind:9321 nutzap event */
export function getNutzapEventId(event: NostrEvent): string | undefined {
  return event.tags.find((t) => t[0] === "e")?.[1];
}

/** Returns the comment from a kind:9321 nutzap event */
export function getNutzapComment(event: NostrEvent): string | undefined {
  return event.content || undefined;
}

/** Calculates the total amount of sats in a kind:9321 nutzap event */
export function getNutzapAmount(event: NostrEvent): number {
  return getOrComputeCachedValue(event, NutzapAmountSymbol, () => {
    const proofs = getNutzapProofs(event);
    return proofs.reduce((total, proof) => total + proof.amount, 0);
  });
}

/** Checks if a nutzap is valid according to NIP-61 requirements */
export function isValidNutzap(nutzap: NostrEvent): boolean {
  const mint = getNutzapMint(nutzap);
  const recipient = getNutzapRecipient(nutzap);
  const proofs = getNutzapProofs(nutzap);

  if (!mint || !recipient || proofs.length === 0) return false;

  return true;
}

/** Checks if a nutzap event has already been redeemed based on kind:7376 wallet history events */
export function isNutzapRedeemed(nutzapId: string, history: NostrEvent[]): boolean {
  return history.some((entry) => getHistoryRedeemed(entry).includes(nutzapId));
}
