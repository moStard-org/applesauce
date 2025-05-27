import { kinds, NostrEvent, UnsignedEvent, verifyEvent } from "nostr-tools";
import { getHiddenContent } from "./hidden-content.js";
import { getOrComputeCachedValue } from "./cache.js";
import {
  EncryptedContentSigner,
  isEncryptedContentLocked,
  lockEncryptedContent,
  setEncryptedContentEncryptionMethod,
  unlockEncryptedContent,
} from "./encrypted-content.js";

export const GiftWrapSealSymbol = Symbol.for("gift-wrap-seal");
export const GiftWrapEventSymbol = Symbol.for("gift-wrap-event");

// Enable encrypted content for gift-wraps
setEncryptedContentEncryptionMethod(kinds.GiftWrap, "nip44");

/** Returns the unsigned seal event in a gift-wrap event */
export function getGiftWrapSeal(gift: NostrEvent): NostrEvent | undefined {
  if (isEncryptedContentLocked(gift)) return undefined;

  return getOrComputeCachedValue(gift, GiftWrapSealSymbol, () => {
    const plaintext = getHiddenContent(gift);
    if (!plaintext) throw new Error("Gift-wrap is locked");
    const seal = JSON.parse(plaintext) as NostrEvent;

    // verify the seal is valid
    verifyEvent(seal);

    return seal;
  });
}

/** Returns the unsigned event in the gift-wrap seal */
export function getGiftWrapEvent(gift: NostrEvent): UnsignedEvent | undefined {
  if (isEncryptedContentLocked(gift)) return undefined;

  return getOrComputeCachedValue(gift, GiftWrapEventSymbol, () => {
    const seal = getGiftWrapSeal(gift);
    if (!seal) throw new Error("Gift is locked");
    const plaintext = getHiddenContent(seal);
    if (!plaintext) throw new Error("Gift-wrap seal is locked");
    const event = JSON.parse(plaintext) as UnsignedEvent;

    if (event.pubkey !== seal.pubkey) throw new Error("Seal author does not match content");

    return event;
  });
}

/** Returns if a gift-wrap event or gift-wrap seal is locked */
export function isGiftWrapLocked(gift: NostrEvent): boolean {
  return isEncryptedContentLocked(gift) || isEncryptedContentLocked(getGiftWrapSeal(gift)!);
}

/** Unlocks and returns the unsigned seal event in a gift-wrap */
export async function unlockGiftWrap(gift: NostrEvent, signer: EncryptedContentSigner): Promise<UnsignedEvent> {
  if (isEncryptedContentLocked(gift)) await unlockEncryptedContent(gift, gift.pubkey, signer);
  const seal = getGiftWrapSeal(gift)!;
  if (isEncryptedContentLocked(seal)) await unlockEncryptedContent(seal, seal.pubkey, signer);
  return getGiftWrapEvent(gift)!;
}

/** Locks a gift-wrap event by removing its cached seal and encrypted content */
export function lockGiftWrap(gift: NostrEvent) {
  Reflect.deleteProperty(gift, GiftWrapSealSymbol);
  Reflect.deleteProperty(gift, GiftWrapEventSymbol);

  lockEncryptedContent(gift);
}
