import { NostrEvent } from "nostr-tools";
import { filter, merge, MonoTypeOperatorFunction, tap } from "rxjs";
import { IStreamEventStore } from "../event-store/interface.js";

/** watches for any updates to the latest event and remits the event when updated */
export function watchEventUpdates(eventStore: IStreamEventStore): MonoTypeOperatorFunction<NostrEvent | undefined> {
  return (source) => {
    let latest: NostrEvent | undefined;

    return merge(
      // Get the latest event
      source.pipe(tap((value) => (latest = value))),
      // listen for updates
      eventStore.updates.pipe(filter((e) => e.id === latest?.id)),
    );
  };
}

/** @deprecated use `watchEventUpdates` instead */
export const listenLatestUpdates = watchEventUpdates;
