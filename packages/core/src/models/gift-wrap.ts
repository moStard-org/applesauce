import { kinds, NostrEvent } from "nostr-tools";
import { identity, map } from "rxjs";

import { Model } from "../event-store/interface.js";
import { isGiftWrapLocked } from "../helpers/gift-wraps.js";
import { watchEventsUpdates } from "../observable/watch-event-updates.js";

/** A model that returns all gift wrap events for a pubkey, optionally filtered by locked status */
export function GiftWrapModel(pubkey: string, locked?: boolean): Model<NostrEvent[]> {
  return (store) =>
    store.timeline({ kinds: [kinds.GiftWrap], "#p": [pubkey] }).pipe(
      // Update the timeline when events are updated
      watchEventsUpdates(store),
      // If lock is specified filter on locked status
      locked !== undefined ? map((events) => events.filter((e) => isGiftWrapLocked(e) === locked)) : identity,
    );
}
