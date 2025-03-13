import { Filter, NostrEvent } from "nostr-tools";
import hash_sum from "hash-sum";

import { getReplaceableUID } from "../helpers/event.js";
import { Query } from "../query-store/index.js";

/** Creates a Query that returns a single event or undefined */
export function SingleEventQuery(id: string): Query<NostrEvent | undefined> {
  return {
    key: id,
    run: (events) => events.event(id),
  };
}

/** Creates a Query that returns a multiple events in a map */
export function MultipleEventsQuery(ids: string[]): Query<Record<string, NostrEvent>> {
  return {
    key: ids.join(","),
    run: (events) => events.events(ids),
  };
}

/** Creates a Query returning the latest version of a replaceable event */
export function ReplaceableQuery(kind: number, pubkey: string, d?: string): Query<NostrEvent | undefined> {
  return {
    key: getReplaceableUID(kind, pubkey, d),
    run: (events) => events.replaceable(kind, pubkey, d),
  };
}

/** Creates a Query that returns an array of sorted events matching the filters */
export function TimelineQuery(filters: Filter | Filter[], includeOldVersion?: boolean): Query<NostrEvent[]> {
  filters = Array.isArray(filters) ? filters : [filters];

  return {
    key: hash_sum(filters) + (includeOldVersion ? "-history" : ""),
    run: (events) => events.timeline(filters, includeOldVersion),
  };
}

/** Creates a Query that returns a directory of events by their UID */
export function ReplaceableSetQuery(
  pointers: { kind: number; pubkey: string; identifier?: string }[],
): Query<Record<string, NostrEvent>> {
  return {
    key: hash_sum(pointers),
    run: (events) => events.replaceableSet(pointers),
  };
}
