import { IEventStore, mapEventsToStore } from "applesauce-core";
import { mergeRelaySets } from "applesauce-core/helpers";
import { Filter, NostrEvent } from "nostr-tools";
import { bufferTime, filter, merge, Observable, pipe } from "rxjs";

import { unique } from "../helpers/array.js";
import { makeCacheRequest, wrapCacheRequest } from "../helpers/cache.js";
import { batchLoader, unwrap } from "../helpers/loaders.js";
import { wrapUpstreamPool } from "../helpers/upstream.js";
import { distinctRelaysBatch } from "../operators/distinct-relays.js";
import { CacheRequest, NostrRequest, UpstreamPool } from "../types.js";

export type TagValuePointer = {
  /** The value of the tag to load */
  value: string;
  /** The relays to load from */
  relays?: string[];
  /** bypass the cache */
  force?: boolean;
};

export type TagValueLoaderOptions = {
  /** Time interval to buffer requests in ms ( default 1000 ) */
  bufferTime?: number;
  /** Max buffer size ( default 200 ) */
  bufferSize?: number;
  /** Restrict queries to specific kinds */
  kinds?: number[];
  /** Restrict queries to specific authors */
  authors?: string[];
  /** Restrict queries since */
  since?: number;
  /** Method used to load from the cache */
  cacheRequest?: CacheRequest;
  /** An array of relays to always fetch from */
  extraRelays?: string[] | Observable<string[]>;
  /** An event store used to deduplicate events */
  eventStore?: IEventStore;
};

export type TagValueLoader = (pointer: TagValuePointer) => Observable<NostrEvent>;

/** Creates a loader that gets tag values from the cache */
export function cacheTagValueLoader(
  request: CacheRequest,
  tagName: string,
  opts?: TagValueLoaderOptions,
): (pointers: TagValuePointer[]) => Observable<NostrEvent> {
  return (pointers) => {
    const baseFilter: Filter = {};
    if (opts?.kinds) baseFilter.kinds = opts.kinds;
    if (opts?.authors) baseFilter.authors = opts.authors;
    if (opts?.since) baseFilter.since = opts.since;

    const filterTag: `#${string}` = `#${tagName}`;
    const filter = { ...baseFilter, [filterTag]: unique(pointers.map((p) => p.value)) };

    return makeCacheRequest(request, [filter]);
  };
}

/** Creates a loader that gets tag values from relays */
export function relaysTagValueLoader(
  request: NostrRequest,
  tagName: string,
  opts?: TagValueLoaderOptions,
): (pointers: TagValuePointer[]) => Observable<NostrEvent> {
  const filterTag: `#${string}` = `#${tagName}`;

  return (pointers) =>
    unwrap(opts?.extraRelays, (extraRelays) => {
      const baseFilter: Filter = {};
      if (opts?.kinds) baseFilter.kinds = opts.kinds;
      if (opts?.authors) baseFilter.authors = opts.authors;
      if (opts?.since) baseFilter.since = opts.since;

      // build request map for relays
      const requestMap = pointers.reduce<Record<string, Filter>>((map, pointer) => {
        const relays = mergeRelaySets(pointer.relays, extraRelays);

        for (const relay of relays) {
          if (!map[relay]) {
            // create new filter for relay
            map[relay] = { ...baseFilter, [filterTag]: [pointer.value] };
          } else {
            // map for relay already exists, add the tag value
            map[relay][filterTag]!.push(pointer.value);
          }
        }
        return map;
      }, {});

      const requests = Object.entries(requestMap).map(([relay, filter]) => request([relay], [filter]));

      return merge(...requests);
    });
}

/** Create a pre-built tag value loader that supports batching, caching, and relay hints */
export function createTagValueLoader(
  pool: UpstreamPool,
  tagName: string,
  opts?: TagValueLoaderOptions,
): TagValueLoader {
  const request = wrapUpstreamPool(pool);
  const cacheRequest = opts?.cacheRequest ? wrapCacheRequest(opts.cacheRequest) : undefined;

  return batchLoader(
    // Create batching sequence
    pipe(
      // buffer requests by time or size
      bufferTime(opts?.bufferTime ?? 1000, undefined, opts?.bufferSize ?? 200),
      // Ignore empty buffers
      filter((b) => b.length > 0),
      // Only request from each relay once
      distinctRelaysBatch((m) => m.value),
    ),
    // Create a loader for batching
    (pointers) =>
      merge(
        // Step 1. load from cache if available
        cacheRequest ? cacheTagValueLoader(cacheRequest, tagName, opts)(pointers) : [],
        // Step 2. load from relays
        relaysTagValueLoader(request, tagName, opts)(pointers),
      ),
    // Filter results based on requests
    (pointer, event) => event.tags.some((tag) => tag[0] === tagName && tag[1] === pointer.value),
    // Pass all events through the store if defined
    opts?.eventStore && mapEventsToStore(opts?.eventStore),
  );
}
