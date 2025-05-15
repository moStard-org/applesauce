import {
  createReplaceableAddress,
  getReplaceableAddress,
  getReplaceableIdentifier,
  isReplaceable,
  mergeRelaySets,
} from "applesauce-core/helpers";
import { NostrEvent } from "nostr-tools";
import { bufferTime, EMPTY, filter, from, isObservable, mergeMap, Observable, of, switchMap, take, tap } from "rxjs";
import { IEventStore } from "applesauce-core";

import {
  createFiltersFromAddressPointers,
  isLoadableAddressPointer,
  LoadableAddressPointer,
} from "../helpers/address-pointer.js";
import { wrapGeneratorFunction } from "../operators/generator.js";
import { FilterRequest, NostrRequest } from "../types.js";
import { createPipeline, triggerPipeline } from "./loader.js";

/** A method that takes address pointers and returns an observable of events */
export type AddressPointerLoader = (pointers: LoadableAddressPointer[]) => Observable<NostrEvent>;

/** Loads address pointers from an async cache */
export function loadAddressPointersFromCache(request: FilterRequest): AddressPointerLoader {
  return (pointers) => request(createFiltersFromAddressPointers(pointers));
}

/** Loads address pointers from an event store */
export function loadAddressPointersFromStore(store: IEventStore): AddressPointerLoader {
  return (pointers) =>
    from(pointers.map((p) => store.getReplaceable(p.kind, p.pubkey, p.identifier)).filter((p) => !!p));
}

/** Loads address pointers from the relay hints */
export function loadAddressPointersFromRelayHints(request: NostrRequest): AddressPointerLoader {
  return (pointers) => {
    const relays = mergeRelaySets(...pointers.map((p) => p.relays));
    if (relays.length === 0) return EMPTY;

    const filters = createFiltersFromAddressPointers(pointers);
    return request(relays, filters);
  };
}

/** Loads address pointers from an array of relays */
export function loadAddressPointersFromRelays(
  request: NostrRequest,
  relays: Observable<string[]> | string[],
): AddressPointerLoader {
  return (pointers) =>
    // Resolve the relays as an observable
    (isObservable(relays) ? relays : of(relays)).pipe(
      // Only take the first value
      take(1),
      // Make the request
      switchMap((relays) => {
        if (relays.length === 0) return EMPTY;

        const filters = createFiltersFromAddressPointers(pointers);
        return request(relays, filters);
      }),
    );
}

/** Creates a loader that loads all event pointers based on their relays */
export function createAddressPointerLoadingSequence(...loaders: AddressPointerLoader[]): AddressPointerLoader {
  return wrapGeneratorFunction<[LoadableAddressPointer[]], NostrEvent>(function* (pointers) {
    let remaining = Array.from(pointers);

    for (const loader of loaders) {
      const results = yield loader(remaining);

      // Get set of addresses loaded
      const addresses = new Set(
        results.filter((e) => isReplaceable(e.kind)).map((event) => getReplaceableAddress(event)),
      );

      // Remove the pointers that were loaded
      remaining = remaining.filter(
        (p) => !addresses.has(createReplaceableAddress(p.kind, p.pubkey, p.identifier)) || p.force === true,
      );

      // If there are no remaining pointers, complete
      if (remaining.length === 0) return;
    }
  });
}

export type AddressLoaderOptions = Partial<{
  /** Time interval to buffer requests in ms ( default 1000 ) */
  bufferTime: number;
  /** Max buffer size ( default 200 ) */
  bufferSize: number;
  /** A method used to load events from a local cache */
  cacheRequest: FilterRequest;
  /** Fallback lookup relays to check when event cant be found */
  lookupRelays: string[] | Observable<string[]>;
  /** An array of relays to always fetch from */
  extraRelays: string[] | Observable<string[]>;
}>;

/** Creates a loader that batches single address pointer requests */
export function createAddressLoader(loader: AddressPointerLoader, options?: AddressLoaderOptions) {
  const pipeline = createPipeline<LoadableAddressPointer, NostrEvent>((source) =>
    source.pipe(
      // filter out invalid pointers
      filter(isLoadableAddressPointer),
      // buffer on time
      bufferTime(options?.bufferTime ?? 1000, undefined, options?.bufferSize ?? 200),
      // ignore empty buffers
      filter((buffer) => buffer.length > 0),
      // address pointer loader
      mergeMap(loader),
    ),
  );

  // Return a function that triggers the pipeline and filters the results
  return (pointer: LoadableAddressPointer) =>
    triggerPipeline(
      pipeline,
      pointer,
      (event) =>
        event.kind === pointer.kind &&
        event.pubkey === pointer.pubkey &&
        pointer.identifier !== undefined &&
        getReplaceableIdentifier(event) === pointer.identifier,
    );
}
