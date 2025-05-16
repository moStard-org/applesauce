import { distinct, filter, identity, map, MonoTypeOperatorFunction } from "rxjs";
import { NostrEvent } from "nostr-tools";

import { IEventStore } from "../event-store/interface.js";

/** Saves all events to an event store and filters out invalid events */
export function mapEventsToStore(store: IEventStore, removeDuplicates = true): MonoTypeOperatorFunction<NostrEvent> {
  return (source) =>
    source.pipe(
      // Map all events to the store
      // NOTE: map is used here because we want to return the single cononical version of the event so that distinct() can be used later
      map((event) => store.add(event)),
      // Ignore invalid events
      filter((e) => e !== null),
      // Remove duplicates if requested
      removeDuplicates ? distinct() : identity,
    );
}
