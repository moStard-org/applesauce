import { Filter, NostrEvent } from "nostr-tools";
import { binarySearch, insertEventIntoDescendingList } from "nostr-tools/utils";
import { Subject } from "rxjs";

import { getIndexableTags, INDEXABLE_TAGS } from "../helpers/event-tags.js";
import {
  createReplaceableAddress,
  getReplaceableAddress,
  isReplaceable,
} from "../helpers/event.js";
import { LRU } from "../helpers/lru.js";
import { logger } from "../logger.js";
import { IEventSet } from "./interface.js";

/**
 * A set of nostr events that can be queried and subscribed to
 * NOTE: does not handle replaceable events or any deletion logic
 */
export class EventSet implements IEventSet {
  protected log = logger.extend("EventSet");

  /** Indexes */
  protected kinds = new Map<number, Set<NostrEvent>>();
  protected authors = new Map<string, Set<NostrEvent>>();
  protected tags = new LRU<Set<NostrEvent>>();
  protected created_at: NostrEvent[] = [];

  /** LRU cache of last events touched */
  events = new LRU<NostrEvent>();

  /** A sorted array of replaceable events by address */
  protected replaceable = new Map<string, NostrEvent[]>();

  /** A stream of events inserted into the database */
  insert$ = new Subject<NostrEvent>();

  /** A stream of events that have been updated */
  update$ = new Subject<NostrEvent>();

  /** A stream of events removed from the database */
  remove$ = new Subject<NostrEvent>();

  /** A method thats called before a new event is inserted */
  onBeforeInsert?: (event: NostrEvent) => boolean;

  /** The number of events in the event set */
  get size() {
    return this.events.size;
  }

  /** Moves an event to the top of the LRU cache */
  touch(event: NostrEvent): void {
    this.events.set(event.id, event);
  }

  /** Checks if the database contains an event without touching it */
  hasEvent(id: string): boolean {
    return this.events.has(id);
  }
  /** Gets a single event based on id */
  getEvent(id: string): NostrEvent | undefined {
    return this.events.get(id);
  }

  /** Checks if the event set has a replaceable event */
  hasReplaceable(kind: number, pubkey: string, identifier?: string): boolean {
    const events = this.replaceable.get(
      createReplaceableAddress(kind, pubkey, identifier),
    );
    return !!events && events.length > 0;
  }
  /** Gets the latest replaceable event */
  getReplaceable(
    kind: number,
    pubkey: string,
    identifier?: string,
  ): NostrEvent | undefined {
    const address = createReplaceableAddress(kind, pubkey, identifier);
    const events = this.replaceable.get(address);
    return events?.[0];
  }
  /** Gets the history of a replaceable event */
  getReplaceableHistory(
    kind: number,
    pubkey: string,
    identifier?: string,
  ): NostrEvent[] | undefined {
    const address = createReplaceableAddress(kind, pubkey, identifier);
    return this.replaceable.get(address);
  }

  /** Gets all events that match the filters */
  getByFilters(filters: Filter | Filter[]): Set<NostrEvent> {
    return this.getEventsForFilters(
      Array.isArray(filters) ? filters : [filters],
    );
  }

  /** Gets a timeline of events that match the filters */
  getTimeline(filters: Filter | Filter[]): NostrEvent[] {
    const timeline: NostrEvent[] = [];
    const events = this.getEventsForFilters(
      Array.isArray(filters) ? filters : [filters],
    );
    for (const event of events) insertEventIntoDescendingList(timeline, event);
    return timeline;
  }

  /** Inserts an event into the database and notifies all subscriptions */
  add(event: NostrEvent): NostrEvent | null {
    const id = event.id;

    const current = this.events.get(id);
    if (current) return current;

    // Ignore events if before insert returns false
    if (this.onBeforeInsert?.(event) === false) return null;

    this.events.set(id, event);
    this.getKindIndex(event.kind).add(event);
    this.getAuthorsIndex(event.pubkey).add(event);

    // Add the event to the tag indexes if they exist
    for (const tag of getIndexableTags(event)) {
      if (this.tags.has(tag)) this.getTagIndex(tag).add(event);
    }

    // Insert into time index
    insertEventIntoDescendingList(this.created_at, event);

    // Insert into replaceable index
    if (isReplaceable(event.kind)) {
      const address = getReplaceableAddress(event);

      let array = this.replaceable.get(address)!;
      if (!this.replaceable.has(address)) {
        // add an empty array if there is no array
        array = [];
        this.replaceable.set(address, array);
      }

      // insert the event into the sorted array
      insertEventIntoDescendingList(array, event);
    }

    // Notify subscribers that the event was inserted
    this.insert$.next(event);

    return event;
  }

  /** Inserts and event into the database and notifies all subscriptions that the event has updated */
  update(event: NostrEvent): boolean {
    const inserted = this.add(event);
    if (inserted) this.update$.next(inserted);
    return inserted !== null;
  }

  /** Removes an event from the database and notifies all subscriptions */
  remove(eventOrId: string | NostrEvent): boolean {
    let event =
      typeof eventOrId === "string" ? this.events.get(eventOrId) : eventOrId;
    if (!event) throw new Error("Missing event");

    const id = event.id;

    // only remove events that are known
    if (!this.events.has(id)) return false;

    this.getAuthorsIndex(event.pubkey).delete(event);
    this.getKindIndex(event.kind).delete(event);

    for (const tag of getIndexableTags(event)) {
      if (this.tags.has(tag)) {
        this.getTagIndex(tag).delete(event);
      }
    }

    // remove from created_at index
    const i = this.created_at.indexOf(event);
    this.created_at.splice(i, 1);

    this.events.delete(id);

    // remove from replaceable index
    if (isReplaceable(event.kind)) {
      const address = getReplaceableAddress(event);
      const array = this.replaceable.get(address);
      if (array && array.includes(event)) {
        const idx = array.indexOf(event);
        array.splice(idx, 1);
      }
    }

    // remove any claims this event has
    this.claims.delete(event);

    // notify subscribers this event was removed
    this.remove$.next(event);

    return true;
  }

  /** A weak map of events that are claimed by other things */
  protected claims = new WeakMap<NostrEvent, any>();

  /** Sets the claim on the event and touches it */
  claim(event: NostrEvent, claim: any): void {
    if (!this.claims.has(event)) {
      this.claims.set(event, claim);
    }

    // always touch event
    this.touch(event);
  }
  /** Checks if an event is claimed by anything */
  isClaimed(event: NostrEvent): boolean {
    return this.claims.has(event);
  }
  /** Removes a claim from an event */
  removeClaim(event: NostrEvent, claim: any): void {
    const current = this.claims.get(event);
    if (current === claim) this.claims.delete(event);
  }
  /** Removes all claims on an event */
  clearClaim(event: NostrEvent): void {
    this.claims.delete(event);
  }

  /** Index helper methods */
  protected getKindIndex(kind: number) {
    if (!this.kinds.has(kind)) this.kinds.set(kind, new Set());
    return this.kinds.get(kind)!;
  }
  protected getAuthorsIndex(author: string) {
    if (!this.authors.has(author)) this.authors.set(author, new Set());
    return this.authors.get(author)!;
  }
  protected getTagIndex(tagAndValue: string) {
    if (!this.tags.has(tagAndValue)) {
      // build new tag index from existing events
      const events = new Set<NostrEvent>();

      const ts = Date.now();
      for (const event of this.events.values()) {
        if (getIndexableTags(event).has(tagAndValue)) {
          events.add(event);
        }
      }
      const took = Date.now() - ts;
      if (took > 100) this.log(`Built index ${tagAndValue} took ${took}ms`);

      this.tags.set(tagAndValue, events);
    }
    return this.tags.get(tagAndValue)!;
  }

  /** Iterates over all events by author */
  *iterateAuthors(authors: Iterable<string>): Generator<NostrEvent> {
    for (const author of authors) {
      const events = this.authors.get(author);

      if (events) {
        for (const event of events) yield event;
      }
    }
  }

  /** Iterates over all events by indexable tag and value */
  *iterateTag(tag: string, values: Iterable<string>): Generator<NostrEvent> {
    for (const value of values) {
      const events = this.getTagIndex(tag + ":" + value);

      if (events) {
        for (const event of events) yield event;
      }
    }
  }

  /** Iterates over all events by kind */
  *iterateKinds(kinds: Iterable<number>): Generator<NostrEvent> {
    for (const kind of kinds) {
      const events = this.kinds.get(kind);

      if (events) {
        for (const event of events) yield event;
      }
    }
  }

  /** Iterates over all events by time */
  *iterateTime(
    since: number | undefined,
    until: number | undefined,
  ): Generator<NostrEvent> {
    let untilIndex = 0;
    let sinceIndex = this.created_at.length - 1;

    let start = until
      ? binarySearch(this.created_at, (mid) => {
        return mid.created_at - until;
      })
      : undefined;

    if (start) untilIndex = start[0];

    const end = since
      ? binarySearch(this.created_at, (mid) => {
        return mid.created_at - since;
      })
      : undefined;

    if (end) sinceIndex = end[0];

    for (let i = untilIndex; i < sinceIndex; i++) {
      yield this.created_at[i];
    }
  }

  /** Iterates over all events by id */
  *iterateIds(ids: Iterable<string>): Generator<NostrEvent> {
    for (const id of ids) {
      if (this.events.has(id)) yield this.events.get(id)!;
    }
  }

  /** Returns all events that match the filter */
  getEventsForFilter(filter: Filter): Set<NostrEvent> {
    // search is not supported, return an empty set
    if (filter.search) return new Set();

    let first = true;
    let events = new Set<NostrEvent>();
    const and = (iterable: Iterable<NostrEvent>) => {
      const set = iterable instanceof Set ? iterable : new Set(iterable);
      if (first) {
        events = set;
        first = false;
      } else {
        for (const event of events) {
          if (!set.has(event)) events.delete(event);
        }
      }
      return events;
    };

    if (filter.ids) and(this.iterateIds(filter.ids));

    let time: NostrEvent[] | null = null;

    // query for time first if since is set
    if (filter.since !== undefined) {
      time = Array.from(this.iterateTime(filter.since, filter.until));
      and(time);
    }

    for (const t of INDEXABLE_TAGS) {
      const key = `#${t}`;
      const values = filter[key as `#${string}`];
      if (values?.length) and(this.iterateTag(t, values));
    }

    if (filter.authors) and(this.iterateAuthors(filter.authors));
    if (filter.kinds) and(this.iterateKinds(filter.kinds));

    // query for time last if only until is set
    if (filter.since === undefined && filter.until !== undefined) {
      time = Array.from(this.iterateTime(filter.since, filter.until));
      and(time);
    }

    // if the filter queried on time and has a limit. truncate the events now
    if (filter.limit && time) {
      const limited = new Set<NostrEvent>();
      for (const event of time) {
        if (limited.size >= filter.limit) break;
        if (events.has(event)) limited.add(event);
      }
      return limited;
    }

    return events;
  }

  /** Returns all events that match the filters */
  getEventsForFilters(filters: Filter[]): Set<NostrEvent> {
    if (filters.length === 0) throw new Error("No Filters");

    let events = new Set<NostrEvent>();

    for (const filter of filters) {
      const filtered = this.getEventsForFilter(filter);
      for (const event of filtered) events.add(event);
    }

    return events;
  }

  /** Remove the oldest events that are not claimed */
  prune(limit = 1000): number {
    let removed = 0;

    let cursor = this.events.first;
    while (cursor) {
      const event = cursor.value;

      if (!this.isClaimed(event)) {
        this.remove(event);
        removed++;

        if (removed >= limit) break;
      }

      cursor = cursor.next;
    }

    return removed;
  }

  /** Resets the event set */
  reset(): void {
    this.events.clear();
    this.kinds.clear();
    this.authors.clear();
    this.tags.clear();
    this.created_at = [];
    this.replaceable.clear();
    this.claims = new WeakMap();
  }
}
