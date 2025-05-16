import { IEventStore } from "applesauce-core";
import { MonoTypeOperatorFunction, tap } from "rxjs";
import { SubscriptionResponse } from "../types.js";

/** Sends all events to the event store but does not remove duplicates */
export function storeEvents(eventStore: IEventStore): MonoTypeOperatorFunction<SubscriptionResponse> {
  return (source) => {
    return source.pipe(tap((event) => typeof event !== "string" && eventStore.add(event)));
  };
}
