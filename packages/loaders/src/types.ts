import { Filter, NostrEvent } from "nostr-tools";
import { Observable } from "rxjs";

/** A flexible method for requesting events from a cache */
export type CacheRequest = (
  filters: Filter[],
) => Observable<NostrEvent> | Promise<NostrEvent | NostrEvent[]> | NostrEvent | NostrEvent[];

/** A method for requesting events from a relay or cache` */
export type FilterRequest = (filters: Filter[]) => Observable<NostrEvent>;

/** A method for requesting events from multiple relays */
export type NostrRequest = (relays: string[], filters: Filter[]) => Observable<NostrEvent>;

/** A filter that is does not have a since or until */
export type TimelessFilter = Omit<Filter, "since" | "until">;
