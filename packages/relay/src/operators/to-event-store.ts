import { OperatorFunction, scan } from "rxjs";
import { IEventStore } from "applesauce-core";
import { NostrEvent } from "nostr-tools";
import { insertEventIntoDescendingList } from "nostr-tools/utils";
import { mapEventsToStore } from "applesauce-core/observable";

import { SubscriptionResponse } from "../types.js";

import { completeOnEose } from "./complete-on-eose.js";

/** Adds all events to event store and returns a deduplicated timeline when EOSE is received */
export function toEventStore(eventStore: IEventStore): OperatorFunction<SubscriptionResponse, NostrEvent[]> {
  return (source) =>
    source.pipe(
      // Complete when there are not events
      completeOnEose(),
      // Save events to store and remove duplicates
      mapEventsToStore(eventStore, true),
      // Add the events to an array
      scan((events, event) => insertEventIntoDescendingList(events, event), [] as NostrEvent[]),
    );
}
