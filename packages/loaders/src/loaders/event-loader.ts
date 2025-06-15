import { IEventStore, mapEventsToStore } from "applesauce-core";
import { NostrEvent } from "nostr-tools";
import { EventPointer } from "nostr-tools/nip19";
import {
  bufferTime,
  catchError,
  EMPTY,
  filter,
  isObservable,
  map,
  merge,
  Observable,
  of,
  pipe,
  switchMap,
  take,
  tap,
} from "rxjs";

import { makeCacheRequest, wrapCacheRequest } from "../helpers/cache.js";
import { consolidateEventPointers } from "../helpers/event-pointer.js";
import { batchLoader, unwrap } from "../helpers/loaders.js";
import { groupByRelay } from "../helpers/pointer.js";
import { wrapGeneratorFunction } from "../operators/generator.js";
import { CacheRequest, NostrRequest, UpstreamPool } from "../types.js";
import { wrapUpstreamPool } from "../helpers/upstream.js";

export type EventPointerLoader = (pointer: EventPointer) => Observable<NostrEvent>;
export type createEventLoader = (pointers: EventPointer[]) => Observable<NostrEvent>;

/** Creates a loader that gets a single event from the cache */
export function cacheEventsLoader(request: CacheRequest): createEventLoader {
  return (pointers) => makeCacheRequest(request, [{ ids: pointers.map((p) => p.id) }]);
}

/** Creates a loader that gets an array of events from a list of relays */
export function relaysEventsLoader(request: NostrRequest, relays: string[] | Observable<string[]>): createEventLoader {
  return (pointers) =>
    unwrap(relays, (relays) => {
      return request(relays, [{ ids: pointers.map((p) => p.id) }]);
    });
}

/** Creates a loader that gets an array of events from a single relay */
export function relayEventsLoader(request: NostrRequest, relay: string): createEventLoader {
  return relaysEventsLoader(request, [relay]);
}

/** Creates a loader that creates a new loader for each relay hint and uses them to load events */
export function relayHintsEventsLoader(
  request: NostrRequest,
  upstream: (request: NostrRequest, relay: string) => createEventLoader = relayEventsLoader,
): createEventLoader {
  const loaders = new Map<string, createEventLoader>();

  // Get or create a new loader for each relay
  const getLoader = (relay: string) => {
    let loader = loaders.get(relay);
    if (!loader) {
      loader = upstream(request, relay);
      loaders.set(relay, loader);
    }

    return loader;
  };

  return (pointers) => {
    // Group pointers by thier relay hints
    const byRelay = groupByRelay(pointers);

    // Request the pointers from each relay
    return merge(...Array.from(byRelay).map(([relay, pointers]) => getLoader(relay)(pointers)));
  };
}

/** Creates a loader that tries to load events from a list of loaders in order */
export function eventLoadingSequence(...loaders: (createEventLoader | undefined)[]): createEventLoader {
  return wrapGeneratorFunction<[EventPointer[]], NostrEvent>(function* (pointers) {
    const found = new Set<string>();
    let remaining = Array.from(pointers);

    for (const loader of loaders) {
      if (loader === undefined) continue;

      yield loader(remaining).pipe(
        // If the loader throws an error, skip it
        catchError(() => EMPTY),
        // Record events that where found
        tap((e) => found.add(e.id)),
      );

      // Remove poniters that where found
      remaining = remaining.filter((p) => !found.has(p.id));

      // If there are no remaining pointers, complete
      if (remaining.length === 0) return;
    }
  });
}

export type EventPointerLoaderOptions = Partial<{
  /** Time interval to buffer requests in ms ( default 1000 ) */
  bufferTime: number;
  /** Max buffer size ( default 200 ) */
  bufferSize: number;
  /** An event store used to deduplicate events */
  eventStore: IEventStore;
  /** A method used to load events from a local cache */
  cacheRequest: CacheRequest;
  /** Whether to follow relay hints ( default true ) */
  followRelayHints: boolean;
  /** An array of relays to always fetch from */
  extraRelays: string[] | Observable<string[]>;
}>;

/** Create a pre-built address pointer loader that supports batching, caching, and lookup relays */
export function createEventLoader(pool: UpstreamPool, opts?: EventPointerLoaderOptions): EventPointerLoader {
  const request = wrapUpstreamPool(pool);
  const cacheRequest = opts?.cacheRequest ? wrapCacheRequest(opts.cacheRequest) : undefined;

  return batchLoader(
    // Create batching sequence
    pipe(
      // buffer requests by time or size
      bufferTime(opts?.bufferTime ?? 1000, undefined, opts?.bufferSize ?? 200),
      // Ingore empty buffers
      filter((b) => b.length > 0),
      // consolidate buffered pointers
      map(consolidateEventPointers),
    ),
    // Create a loader for batching
    eventLoadingSequence(
      // Step 1. load from cache if available
      cacheRequest ? cacheEventsLoader(cacheRequest) : undefined,
      // Step 2. load from relay hints on pointers
      opts?.followRelayHints !== false ? relayHintsEventsLoader(request) : undefined,
      // Step 3. load from extra relays
      opts?.extraRelays ? relaysEventsLoader(request, opts.extraRelays) : undefined,
    ),
    // Filter resutls based on requests
    (pointer, event) => event.id === pointer.id,
    // Pass all events through the store if defined
    opts?.eventStore && mapEventsToStore(opts.eventStore),
  );
}
