import { createContext, PropsWithChildren } from "react";
import { IEventStore } from "applesauce-core";

export const EventStoreContext = createContext<IEventStore | null>(null);

/** Provides a EventStore to the component tree */
export function EventStoreProvider({ eventStore, children }: PropsWithChildren<{ eventStore: IEventStore }>) {
  return <EventStoreContext.Provider value={eventStore}>{children}</EventStoreContext.Provider>;
}
