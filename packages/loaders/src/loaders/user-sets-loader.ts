import { logger } from "applesauce-core";
import { markFromCache } from "applesauce-core/helpers";
import { nanoid } from "nanoid";
import { NostrEvent } from "nostr-tools";
import { bufferTime, EMPTY, filter, map, merge, Observable, tap } from "rxjs";

import { consolidateAddressPointers, createFiltersFromAddressPointers } from "../helpers/address-pointer.js";
import { groupByRelay } from "../helpers/pointer.js";
import { completeOnEOSE } from "../operators/complete-on-eose.js";
import { distinctRelaysBatch } from "../operators/distinct-relays.js";
import { generator } from "../operators/generator.js";
import { CacheRequest, Loader, NostrRequest } from "./loader.js";

export type LoadableSetPointer = {
  /** A replaceable kind >= 30000 & < 40000 */
  kind: number;
  pubkey: string;
  /** Relays to load from */
  relays?: string[];
  /** Load the sets even if it has already been loaded */
  force?: boolean;
};

/** A generator that tries to load the address pointers from the cache first, then tries the relays */
function* cacheFirstSequence(
  request: NostrRequest,
  pointers: LoadableSetPointer[],
  log: typeof logger,
  opts?: { cacheRequest?: CacheRequest; extraRelays?: string[] },
): Generator<Observable<NostrEvent>, undefined, NostrEvent[]> {
  const id = nanoid(8);
  log = log.extend(id);

  // first attempt, load from cache relays
  if (opts?.cacheRequest) {
    log(`Checking cache`);
    const filters = createFiltersFromAddressPointers(pointers);

    if (filters.length > 0) {
      const results = yield opts.cacheRequest(filters).pipe(
        // mark the event as from the cache
        tap((event) => markFromCache(event)),
      );

      if (results.length > 0) log(`Loaded ${results.length} events from cache`);
    }
  }

  let byRelay = groupByRelay(pointers, opts?.extraRelays);

  // load sets from relays
  yield merge<NostrEvent[]>(
    ...Array.from(byRelay.entries()).map(([relay, pointers]) => {
      let filters = createFiltersFromAddressPointers(pointers);
      if (filters.length === 0) return EMPTY;

      let count = 0;
      log(`Requesting from ${relay}`, pointers);

      return request([relay], filters, id).pipe(
        completeOnEOSE(),
        tap({
          next: () => count++,
          complete: () => log(`Completed ${relay}, loaded ${count} events`),
        }),
      );
    }),
  );
}

export type UserSetsLoaderOptions = {
  /**
   * Time interval to buffer requests in ms
   * @default 1000
   */
  bufferTime?: number;
  /** A method used to load events from a local cache */
  cacheRequest?: CacheRequest;
  /**
   * How long the loader should wait before it allows an event pointer to be refreshed from a relay
   * @default 120000
   */
  refreshTimeout?: number;
};

/** A loader that can be used to load users NIP-51 sets events ( kind >= 30000 < 40000) */
export class UserSetsLoader extends Loader<LoadableSetPointer, NostrEvent> {
  log: typeof logger = logger.extend("UserSetsLoader");

  /** An array of relays to always fetch from */
  extraRelays?: string[];

  constructor(request: NostrRequest, opts?: UserSetsLoaderOptions) {
    let options = opts || {};

    super((source) =>
      source.pipe(
        // load first from cache
        bufferTime(options?.bufferTime ?? 1000),
        // ignore empty buffers
        filter((buffer) => buffer.length > 0),
        // only load from each relay once
        distinctRelaysBatch((p) => p.kind + ":" + p.pubkey, options.refreshTimeout ?? 120_000),
        // deduplicate address pointers
        map(consolidateAddressPointers),
        // check cache, relays, lookup relays in that order
        generator<LoadableSetPointer[], NostrEvent>(
          (pointers) => cacheFirstSequence(request, pointers, this.log, options),
          // there will always be more events, never complete
          false,
        ),
      ),
    );
  }
}
