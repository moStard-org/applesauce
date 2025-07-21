import { from, isObservable, Observable, of, switchMap, tap } from "rxjs";
import { Filter, NostrEvent } from "nostr-tools";
import { CacheRequest } from "../types.js";
import { markFromCache } from "applesauce-core/helpers";

/** Calls the cache request and converts the reponse into an observable */
export function unwrapCacheRequest(request: CacheRequest, filters: Filter[]): Observable<NostrEvent> {
  const result = request(filters);

  if (isObservable(result)) return result;
  else if (result instanceof Promise) return from(result).pipe(switchMap((v) => (Array.isArray(v) ? from(v) : of(v))));
  else if (Array.isArray(result)) return from(result);
  else return of(result);
}

/** Calls a cache request method with filters and marks all returned events as being from the cache */
export function makeCacheRequest(request: CacheRequest, filters: Filter[]): Observable<NostrEvent> {
  return unwrapCacheRequest(request, filters).pipe(tap((e) => markFromCache(e)));
}
