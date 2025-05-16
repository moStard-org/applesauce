import { logger } from "applesauce-core";
import { getEventUID, getReplaceableIdentifier, markFromCache, mergeRelaySets } from "applesauce-core/helpers";
import { nanoid } from "nanoid";
import { NostrEvent } from "nostr-tools";
import { isAddressableKind } from "nostr-tools/kinds";
import { bufferTime, filter, map, Observable, tap } from "rxjs";

import {
  consolidateAddressPointers,
  createFiltersFromAddressPointers,
  getAddressPointerId,
  getRelaysFromPointers,
  isLoadableAddressPointer,
  LoadableAddressPointer,
} from "../helpers/address-pointer.js";
import { completeOnEOSE } from "../operators/complete-on-eose.js";
import { distinctRelaysBatch } from "../operators/distinct-relays.js";
import { generator } from "../operators/generator.js";
import { CacheRequest, Loader, NostrRequest } from "./loader.js";

/** A generator that tries to load the address pointers from the cache first, then tries the relays */
function* cacheFirstSequence(
  request: NostrRequest,
  pointers: LoadableAddressPointer[],
  log: typeof logger,
  opts?: { cacheRequest?: CacheRequest; lookupRelays?: string[]; extraRelays?: string[] },
): Generator<Observable<NostrEvent>, undefined, NostrEvent[]> {
  const id = nanoid(4);

  let remaining = Array.from(pointers);
  const pointerRelays = Array.from(getRelaysFromPointers(pointers));

  // handle previous step results and decide if to exit
  const handleResults = (results: NostrEvent[]) => {
    if (results.length) {
      const coordinates = new Set(results.map((event) => getEventUID(event)));

      // if there where results, filter out any pointers that where found
      remaining = remaining.filter((pointer) => {
        const found = coordinates.has(getAddressPointerId(pointer));
        if (found && pointer.force !== true) return false;
        else return true;
      });

      // If there are none left, complete
      if (remaining.length === 0) {
        log(`[${id}] Complete`);
        return true;
      }
    }

    return false;
  };

  // first attempt, load from cache relays
  if (opts?.cacheRequest) {
    log(`[${id}] Checking cache`, remaining);

    const filters = createFiltersFromAddressPointers(remaining);
    const results = yield opts.cacheRequest(filters).pipe(
      // mark the event as from the cache
      tap((event) => markFromCache(event)),
    );

    if (handleResults(results)) return;
  }

  // load from pointer relays and extra relays
  const mergedRelays = mergeRelaySets(pointerRelays, opts?.extraRelays);
  if (mergedRelays.length > 0) {
    log(`[${id}] Requesting`, mergedRelays, remaining);

    const filters = createFiltersFromAddressPointers(remaining);
    const results = yield request(mergedRelays, filters).pipe(completeOnEOSE());

    if (handleResults(results)) return;
  }

  // finally load from lookup relays
  if (opts?.lookupRelays) {
    // make sure we aren't asking a relay twice
    const relays = opts.lookupRelays.filter((r) => !pointerRelays.includes(r));
    if (relays.length === 0) return;

    log(`[${id}] Request from lookup`, relays, remaining);

    const filters = createFiltersFromAddressPointers(remaining);
    const results = yield request(relays, filters).pipe(completeOnEOSE());

    if (handleResults(results)) return;
  }
}

export type ReplaceableLoaderOptions = {
  /**
   * Time interval to buffer requests in ms
   * @default 1000
   */
  bufferTime?: number;
  /** A method used to load events from a local cache */
  cacheRequest?: CacheRequest;
  /** Fallback lookup relays to check when event cant be found */
  lookupRelays?: string[];
  /** An array of relays to always fetch from */
  extraRelays?: string[];
};

export class ReplaceableLoader extends Loader<LoadableAddressPointer, NostrEvent> {
  log: typeof logger = logger.extend("ReplaceableLoader");

  /** A method used to load events from a local cache */
  cacheRequest?: CacheRequest;
  /** Fallback lookup relays to check when event cant be found */
  lookupRelays?: string[];

  /** An array of relays to always fetch from */
  extraRelays?: string[];

  constructor(request: NostrRequest, opts?: ReplaceableLoaderOptions) {
    super(
      (source) => {
        return source.pipe(
          // filter out invalid pointers
          filter(isLoadableAddressPointer),
          // buffer on time
          bufferTime(opts?.bufferTime ?? 1000),
          // ignore empty buffers
          filter((buffer) => buffer.length > 0),
          // only fetch from each relay once
          distinctRelaysBatch(getAddressPointerId),
          // consolidate buffered pointers
          map(consolidateAddressPointers),
          // ignore empty buffer
          filter((buffer) => buffer.length > 0),
          // check cache, relays, lookup relays in that order
          generator<LoadableAddressPointer[], NostrEvent>(
            (pointers) =>
              cacheFirstSequence(request, pointers, this.log, {
                cacheRequest: this.cacheRequest,
                lookupRelays: this.lookupRelays,
                extraRelays: this.extraRelays,
              }),
            // there will always be more events, never complete
            false,
          ),
        );
      },
      (pointer, event) =>
        event.pubkey === pointer.pubkey &&
        event.kind === pointer.kind &&
        (pointer.identifier && isAddressableKind(event.kind)
          ? getReplaceableIdentifier(event) === pointer.identifier
          : true),
    );

    // set options
    this.cacheRequest = opts?.cacheRequest;
    this.lookupRelays = opts?.lookupRelays;
    this.extraRelays = opts?.extraRelays;
  }
}
