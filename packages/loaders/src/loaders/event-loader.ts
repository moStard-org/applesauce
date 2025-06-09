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
import { batchLoader } from "../helpers/loaders.js";
import { groupByRelay } from "../helpers/pointer.js";
import { wrapGeneratorFunction } from "../operators/generator.js";
import { CacheRequest, NostrRequest, UpstreamPool } from "../types.js";
import { wrapUpstreamPool } from "../helpers/upstream.js";

export type EventPointerLoader = (pointer: EventPointer) => Observable<NostrEvent>;
export type EventPointersLoader = (pointers: EventPointer[]) => Observable<NostrEvent>;

/** Creates a loader that gets a single event from the cache */
export function cacheEventPointersLoader(request: CacheRequest): EventPointersLoader {
  return (pointers) => makeCacheRequest(request, [{ ids: pointers.map((p) => p.id) }]);
}

/** Creates a loader that gets an array of events from a list of relays */
export function relaysEventPointersLoader(
  request: NostrRequest,
  relays: string[] | Observable<string[]>,
): EventPointersLoader {
  return (pointers) =>
    // unwrap relays observable
    (isObservable(relays) ? relays : of(relays)).pipe(
      // take the first value
      take(1),
      // Request events from relays
      switchMap((relays) => request(relays, [{ ids: pointers.map((p) => p.id) }])),
    );
}

/** Creates a loader that gets an array of events from a single relay */
export function relayEventPointersLoader(request: NostrRequest, relay: string): EventPointersLoader {
  return relaysEventPointersLoader(request, [relay]);
}

/** Creates a loader that creates a new loader for each relay hint and uses them to load events */
export function relayHintsEventPointersLoader(
  request: NostrRequest,
  upstream: (request: NostrRequest, relay: string) => EventPointersLoader = relayEventPointersLoader,
): EventPointersLoader {
  const loaders = new Map<string, EventPointersLoader>();

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
export function eventPointersLoadingSequence(...loaders: (EventPointersLoader | undefined)[]): EventPointersLoader {
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
export function eventPointerLoader(pool: UpstreamPool, opts?: EventPointerLoaderOptions): EventPointerLoader {
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
    eventPointersLoadingSequence(
      // Step 1. load from cache if available
      cacheRequest ? cacheEventPointersLoader(cacheRequest) : undefined,
      // Step 2. load from relay hints on pointers
      opts?.followRelayHints !== false ? relayHintsEventPointersLoader(request) : undefined,
      // Step 3. load from extra relays
      opts?.extraRelays ? relaysEventPointersLoader(request, opts.extraRelays) : undefined,
    ),
    // Filter resutls based on requests
    (pointer, event) => event.id === pointer.id,
    // Pass all events through the store if defined
    opts?.eventStore && mapEventsToStore(opts.eventStore),
  );
}
