import { kinds, NostrEvent } from "nostr-tools";
import { identity, map } from "rxjs";

import { isGiftWrapLocked } from "../helpers/gift-wraps.js";
import { watchEventsUpdates } from "../observable/watch-event-updates.js";
import { Query } from "../query-store/query-store.js";

/** A query that returns all gift wrap events for a pubkey, optionally filtered by locked status */
export function GiftWrapQuery(pubkey: string, locked?: boolean): Query<NostrEvent[]> {
  return (store) =>
    store.timeline({ kinds: [kinds.GiftWrap], "#p": [pubkey] }).pipe(
      // Update the timeline when events are updated
      watchEventsUpdates(store),
      // If lock is specified filter on locked status
      locked !== undefined ? map((events) => events.filter((e) => isGiftWrapLocked(e) === locked)) : identity,
    );
}
