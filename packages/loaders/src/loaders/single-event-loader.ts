import { bufferTime, filter, from, map, mergeAll, Observable, tap } from "rxjs";
import { markFromCache } from "applesauce-core/helpers";
import { logger } from "applesauce-core";
import { Filter, NostrEvent } from "nostr-tools";
import { nanoid } from "nanoid";

import { CacheRequest, Loader, NostrRequest } from "./loader.js";
import { generator } from "../operators/generator.js";
import { distinctRelaysBatch } from "../operators/distinct-relays.js";
import { groupByRelay } from "../helpers/pointer.js";
import { consolidateEventPointers } from "../helpers/event-pointer.js";
import { completeOnEOSE } from "../operators/complete-on-eose.js";

export type LoadableEventPointer = {
  id: string;
  /** Relays to load from */
  relays?: string[];
};

export type SingleEventLoaderOptions = {
  /**
   * Time interval to buffer requests in ms
   * @default 1000
   */
  bufferTime?: number;
  /**
   * How long the loader should wait before it allows an event pointer to be refreshed from a relay
   * @default 60000
   */
  refreshTimeout?: number;
  /** A method used to load events from a local cache */
  cacheRequest?: CacheRequest;
  /** An array of relays to always fetch from */
  extraRelays?: string[];
};

function* cacheFirstSequence(
  request: NostrRequest,
  pointers: LoadableEventPointer[],
  opts: { cacheRequest?: CacheRequest; extraRelays?: string[] },
  log: typeof logger,
): Generator<Observable<NostrEvent>, undefined, NostrEvent[]> {
  let remaining = [...pointers];
  const id = nanoid(8);
  log = log.extend(id);

  const loaded = (packets: NostrEvent[]) => {
    const ids = new Set(packets.map((p) => p.id));
    remaining = remaining.filter((p) => !ids.has(p.id));
  };

  if (opts?.cacheRequest) {
    let filter: Filter = { ids: remaining.map((e) => e.id) };

    const results = yield opts.cacheRequest([filter]).pipe(
      // mark the event as from the cache
      tap((event) => markFromCache(event)),
    );

    if (results.length > 0) {
      log(`Loaded ${results.length} events from cache`);
      loaded(results);
    }
  }

  // exit early if all pointers are loaded
  if (remaining.length === 0) return;

  let byRelay = groupByRelay(remaining, opts.extraRelays);

  // load remaining pointers from the relays
  let results = yield from(
    Array.from(byRelay.entries()).map(([relay, pointers]) => {
      let filter: Filter = { ids: pointers.map((e) => e.id) };

      let count = 0;
      log(`Requesting from ${relay}`, filter.ids);

      return request([relay], [filter], id)
        .pipe(completeOnEOSE())
        .pipe(
          tap({
            next: () => count++,
            complete: () => log(`Completed ${relay}, loaded ${count} events`),
          }),
        );
    }),
  ).pipe(mergeAll());

  loaded(results);

  if (remaining.length > 0) {
    // failed to find remaining
    log(
      "Failed to load",
      remaining.map((p) => p.id),
    );
  }
}

export class SingleEventLoader extends Loader<LoadableEventPointer, NostrEvent> {
  log: typeof logger = logger.extend("SingleEventLoader");

  /** A method used to load events from a local cache */
  cacheRequest?: CacheRequest;

  /** An array of relays to always fetch from */
  extraRelays?: string[];

  constructor(request: NostrRequest, opts?: SingleEventLoaderOptions) {
    super((source) =>
      source.pipe(
        // batch every second
        bufferTime(opts?.bufferTime ?? 1000),
        // ignore empty buffers
        filter((buffer) => buffer.length > 0),
        // only request events from relays once
        distinctRelaysBatch((p) => p.id, opts?.refreshTimeout ?? 60_000),
        // ensure there is only one of each event pointer
        map(consolidateEventPointers),
        // run the loader sequence
        generator<LoadableEventPointer[], NostrEvent>(
          (pointers) =>
            cacheFirstSequence(
              request,
              pointers,
              { cacheRequest: this.cacheRequest, extraRelays: this.extraRelays },
              this.log,
            ),
          // there will always be more events, never complete
          false,
        ),
      ),
    );

    this.cacheRequest = opts?.cacheRequest;
    this.extraRelays = opts?.extraRelays;
  }
}
