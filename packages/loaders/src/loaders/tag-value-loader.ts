import { logger } from "applesauce-core";
import { markFromCache, mergeRelaySets } from "applesauce-core/helpers";
import { Filter, NostrEvent } from "nostr-tools";
import { bufferTime, filter, merge, mergeMap, tap } from "rxjs";

import { unique } from "../helpers/array.js";
import { completeOnEOSE } from "../operators/complete-on-eose.js";
import { distinctRelaysBatch } from "../operators/distinct-relays.js";
import { CacheRequest, Loader, NostrRequest, RelayFilterMap } from "./loader.js";

export type TabValuePointer = {
  /** The value of the tag to load */
  value: string;
  /** The relays to load from */
  relays?: string[];
  /** bypass the cache */
  force?: boolean;
};

export type TagValueLoaderOptions = {
  /** the name of this loader (for debugging) */
  name?: string;
  /**
   * Time interval to buffer requests in ms
   * @default 1000
   */
  bufferTime?: number;

  /** Restrict queries to specific kinds */
  kinds?: number[];
  /** Restrict queries to specific authors */
  authors?: string[];
  /** Restrict queries since */
  since?: number;

  /** Method used to load from the cache */
  cacheRequest?: CacheRequest;
  /** An array of relays to always fetch from */
  extraRelays?: string[];
};

export class TagValueLoader extends Loader<TabValuePointer, NostrEvent> {
  name: string;
  protected log: typeof logger = logger.extend("TagValueLoader");

  /** A method to load events from a local cache */
  cacheRequest?: CacheRequest;

  /** An array of relays to always fetch from */
  extraRelays?: string[];

  constructor(request: NostrRequest, tagName: string, opts?: TagValueLoaderOptions) {
    const filterTag: `#${string}` = `#${tagName}`;

    super((source) =>
      source.pipe(
        // batch the pointers
        bufferTime(opts?.bufferTime ?? 1000),
        // filter out empty batches
        filter((pointers) => pointers.length > 0),
        // only request from each relay once
        distinctRelaysBatch((m) => m.value),
        // batch pointers into requests
        mergeMap((pointers) => {
          const baseFilter: Filter = {};
          if (opts?.kinds) baseFilter.kinds = opts.kinds;
          if (opts?.since) baseFilter.since = opts.since;
          if (opts?.authors) baseFilter.authors = opts.authors;

          // build request map for relays
          const requestMap = pointers.reduce<RelayFilterMap>((map, pointer) => {
            const relays = mergeRelaySets(pointer.relays, this.extraRelays);

            for (const relay of relays) {
              if (!map[relay]) {
                // create new filter for relay
                const filter: Filter = { ...baseFilter, [filterTag]: [pointer.value] };
                map[relay] = [filter];
              } else {
                // map for relay already exists, add the tag value
                const filter = map[relay][0];
                filter[filterTag]!.push(pointer.value);
              }
            }
            return map;
          }, {});

          let fromCache = 0;
          const cacheRequest = this?.cacheRequest?.([
            { ...baseFilter, [filterTag]: unique(pointers.map((p) => p.value)) },
          ]).pipe(
            // mark the event as from the cache
            tap({
              next: (event) => {
                markFromCache(event);
                fromCache++;
              },
              complete: () => {
                if (fromCache > 0) this.log(`Loaded ${fromCache} from cache`);
              },
            }),
          );

          const requests = Object.entries(requestMap).map(([relay, filters]) =>
            request([relay], filters).pipe(completeOnEOSE()),
          );

          this.log(`Requesting ${pointers.length} tag values from ${requests.length} relays`);

          return cacheRequest ? merge(cacheRequest, ...requests) : merge(...requests);
        }),
      ),
    );

    // Set options
    this.cacheRequest = opts?.cacheRequest;
    this.extraRelays = opts?.extraRelays;

    // create a unique logger for this instance
    this.name = opts?.name ?? "";
    this.log = this.log.extend(
      opts?.kinds ? `${this.name} ${filterTag} (${opts?.kinds?.join(",")})` : `${this.name} ${filterTag}`,
    );
  }
}
