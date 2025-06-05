import { NostrEvent, UnsignedEvent, verifyEvent } from "nostr-tools";
import { getOrComputeCachedValue } from "./cache.js";
import {
  EncryptedContentSigner,
  getEncryptedContent,
  isEncryptedContentLocked,
  lockEncryptedContent,
  unlockEncryptedContent
} from "./encrypted-content.js";
import { isEvent, notifyEventUpdate } from "./event.js";

export type Rumor = UnsignedEvent & {
  id: string;
};

export const GiftWrapSealSymbol = Symbol.for("gift-wrap-seal");
export const GiftWrapEventSymbol = Symbol.for("gift-wrap-event");

/** Returns the unsigned seal event in a gift-wrap event */
export function getGiftWrapSeal(gift: NostrEvent): NostrEvent | undefined {
  if (isEncryptedContentLocked(gift)) return undefined;

  const plaintext = getEncryptedContent(gift);
  if (!plaintext) return undefined;

  return getOrComputeCachedValue(gift, GiftWrapSealSymbol, () => {
    const seal = JSON.parse(plaintext) as NostrEvent;
    verifyEvent(seal);
    return seal;
  });
}

/**
 * Returns the unsigned event in the gift-wrap seal
 * @throws {Error} If the author of the rumor event does not match the author of the seal
 */
export function getGiftWrapEvent(gift: NostrEvent): Rumor | undefined {
  if (isEncryptedContentLocked(gift)) return undefined;

  const seal = getGiftWrapSeal(gift);
  if (!seal) return undefined;
  const plaintext = getEncryptedContent(seal);
  if (!plaintext) return undefined;

  return getOrComputeCachedValue(gift, GiftWrapEventSymbol, () => {
    const event = JSON.parse(plaintext) as Rumor;
    if (event.pubkey !== seal.pubkey) throw new Error("Seal author does not match content");
    return event;
  });
}

/** Returns if a gift-wrap event or gift-wrap seal is locked */
export function isGiftWrapLocked(gift: NostrEvent): boolean {
  if (isEncryptedContentLocked(gift)) return true;
  else {
    const seal = getGiftWrapSeal(gift);
    if (!seal || isEncryptedContentLocked(seal)) return true;
    else return false;
  }
}

/** Unlocks and returns the unsigned seal event in a gift-wrap */
export async function unlockGiftWrap(gift: NostrEvent, signer: EncryptedContentSigner): Promise<UnsignedEvent> {
  // First unlock the gift-wrap event
  if (isEncryptedContentLocked(gift)) await unlockEncryptedContent(gift, gift.pubkey, signer);

  // Next get and unlock the seal
  const seal = getGiftWrapSeal(gift);
  if (!seal) throw new Error("Failed to read seal in gift wrap");
  if (isEncryptedContentLocked(seal)) await unlockEncryptedContent(seal, seal.pubkey, signer);

  // Finally get the rumor event
  const rumor = getGiftWrapEvent(gift);
  if (!rumor) throw new Error("Failed to read rumor in gift wrap");

  // if the event has been added to an event store, notify it
  if (isEvent(gift)) notifyEventUpdate(gift);

  return rumor;
}

/** Locks a gift-wrap event by removing its cached seal and encrypted content */
export function lockGiftWrap(gift: NostrEvent) {
  Reflect.deleteProperty(gift, GiftWrapSealSymbol);
  Reflect.deleteProperty(gift, GiftWrapEventSymbol);

  lockEncryptedContent(gift);
}
