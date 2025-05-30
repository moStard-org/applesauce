import { NostrEvent, UnsignedEvent, verifyEvent } from "nostr-tools";
import { getOrComputeCachedValue } from "./cache.js";
import {
  EncryptedContentSigner,
  getEncryptedContent,
  isEncryptedContentLocked,
  lockEncryptedContent,
  unlockEncryptedContent,
} from "./encrypted-content.js";
import { getParentEventStore, isEvent } from "./event.js";

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
  if (isEvent(gift)) {
    const eventStore = getParentEventStore(gift);
    if (eventStore) eventStore.update(gift);
  }

  return rumor;
}

/** Locks a gift-wrap event by removing its cached seal and encrypted content */
export function lockGiftWrap(gift: NostrEvent) {
  Reflect.deleteProperty(gift, GiftWrapSealSymbol);
  Reflect.deleteProperty(gift, GiftWrapEventSymbol);

  lockEncryptedContent(gift);
}

/** Starts a subscription that persists and restores all encrypted content */
// export function persistGiftWrapsEncryptedContent(eventStore: IEventStore, storage: EncryptedContentCache): () => void {
//   // Keep track of events that have been restored so we don't save them again
//   const restored = new Set<string>();

//   const updateGifts = eventStore.updates.pipe(filter((e) => e.kind === kinds.GiftWrap));
//   const updateSeals = updateGifts.pipe(
//     map((e) => getGiftWrapSeal(e)),
//     filter((e) => !!e),
//   );

//   const saves = merge(updateGifts, updateSeals)
//     .pipe(
//       filter((e) => !isEncryptedContentLocked(e)),
//       filter((e) => !restored.has(e.id)),
//     )
//     .subscribe((event) => {
//       const content = getEncryptedContent(event);
//       if (content)
//         storage.setItem(event.id, content).catch((e) => {
//           // Ignore write errors
//         });
//     });

//   // Restore gift wraps when they are inserted
//   const restoreGifts = eventStore.inserts
//     .pipe(filter((e) => e.kind === kinds.GiftWrap && isEncryptedContentLocked(e)))
//     .subscribe(async (event) => {
//       const content = await storage.getItem(event.id);
//       if (content) setEncryptedContentCache(event, content);
//     });

//   // Attempt to restore seals when the gift wrap is updated
//   const restoreSeals = updateGifts.pipe(filter((e) => !isEncryptedContentLocked(e))).subscribe(async (event) => {
//     const seal = getGiftWrapSeal(event);
//     if (seal && isEncryptedContentLocked(seal)) {
//       const content = await storage.getItem(seal.id);
//       if (content) setEncryptedContentCache(seal, content);
//     }
//   });

//   // Return stop method
//   return () => {
//     saves.unsubscribe();
//   };
// }
