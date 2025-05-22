import { NostrEvent } from "nostr-tools";
import { AddressPointer, EventPointer } from "nostr-tools/nip19";
import { getOrComputeCachedValue } from "./cache.js";
import { getTagValue } from "./event.js";
import { getAddressPointerFromATag, getEventPointerFromETag, getProfilePointerFromPTag } from "./pointers.js";
import { mergeRelaySets } from "./relays.js";
import { isATag, isETag, isPTag } from "./tags.js";

const isInteger = (str: string) => Number.isInteger(Number(str));

export const ReactionEventPointerSymbol = Symbol("reaction-event-pointer");
export const ReactionAddressPointerSymbol = Symbol("reaction-address-pointer");

/** Returns the EventPointer for a reaction event */
export function getReactionEventPointer(event: NostrEvent): EventPointer | undefined {
  return getOrComputeCachedValue(event, ReactionEventPointerSymbol, () => {
    const eTag = event.tags.find(isETag);
    if (!eTag) return undefined;

    // Get the event pointer from the e tag
    const pointer = getEventPointerFromETag(eTag);
    if (!pointer) return undefined;

    // set the kind if there is a k tag
    const k = getTagValue(event, "k");
    if (k && isInteger(k)) pointer.kind = parseInt(k);

    // Get the author from the p tag if not set
    if (!pointer.author) {
      const p = event.tags.find(isPTag);
      if (p) {
        const author = getProfilePointerFromPTag(p);
        pointer.author = author.pubkey;

        // Copy relay hints from "p" tag
        if (author.relays) pointer.relays = mergeRelaySets(author.relays, pointer.relays);
      }
    }

    return pointer;
  });
}

/** Returns the AddressPointer for a reaction event */
export function getReactionAddressPointer(event: NostrEvent): AddressPointer | undefined {
  return getOrComputeCachedValue(event, ReactionAddressPointerSymbol, () => {
    const aTag = event.tags.find(isATag);
    if (!aTag) return undefined;

    const pointer = getAddressPointerFromATag(aTag);
    if (!pointer) return undefined;

    // Get extra relay hints from the p tag
    const p = event.tags.find(isPTag);
    if (p) {
      const author = getProfilePointerFromPTag(p);

      // Copy relay hints from "p" tag
      if (author.relays) pointer.relays = mergeRelaySets(author.relays, pointer.relays);
    }

    return pointer;
  });
}
