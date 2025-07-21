import { kinds, NostrEvent } from "nostr-tools";
import { identity, map, of } from "rxjs";

import { Model } from "../event-store/interface.js";
import { getGiftWrapRumor, isGiftWrapLocked, Rumor } from "../helpers/gift-wraps.js";
import { watchEventsUpdates, watchEventUpdates } from "../observable/watch-event-updates.js";

/** A model that returns all gift wrap events for a pubkey, optionally filtered by locked status */
export function GiftWrapsModel(pubkey: string, locked?: boolean): Model<NostrEvent[]> {
  return (store) =>
    store.timeline({ kinds: [kinds.GiftWrap], "#p": [pubkey] }).pipe(
      // Update the timeline when events are updated
      watchEventsUpdates(store),
      // If lock is specified filter on locked status
      locked !== undefined ? map((events) => events.filter((e) => isGiftWrapLocked(e) === locked)) : identity,
    );
}

/** A model that returns the rumor event of a gift wrap event when its unlocked */
export function GiftWrapRumorModel(gift: NostrEvent | string): Model<Rumor | undefined> {
  return (events) =>
    (typeof gift === "string" ? events.event(gift) : of(gift)).pipe(
      // Listen for updates to the event
      watchEventUpdates(events),
      // Get the rumor event
      map((event) => event && getGiftWrapRumor(event)),
    );
}
