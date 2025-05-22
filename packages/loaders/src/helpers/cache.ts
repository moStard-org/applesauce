import { from, isObservable, Observable, of, switchMap } from "rxjs";
import { Filter, NostrEvent } from "nostr-tools";
import { CacheRequest } from "../types.js";

/** Calls the cache request and converts the reponse into an observable */
export function unwrapCacheRequest(request: CacheRequest, filters: Filter[]): Observable<NostrEvent> {
  const result = request(filters);

  if (isObservable(result)) return result;
  else if (result instanceof Promise) return from(result).pipe(switchMap((v) => (Array.isArray(v) ? from(v) : of(v))));
  else if (Array.isArray(result)) return from(result);
  else return of(result);
}
