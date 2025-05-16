import { nanoid } from "nanoid";
import { Filter, NostrEvent } from "nostr-tools";
import { catchError, EMPTY, endWith, ignoreElements, merge, Observable, of } from "rxjs";

import { completeOnEose } from "./operators/complete-on-eose.js";
import { onlyEvents } from "./operators/only-events.js";
import {
  IGroup,
  IRelay,
  PublishResponse,
  SubscriptionResponse,
  PublishOptions,
  RequestOptions,
  SubscriptionOptions,
} from "./types.js";

export class RelayGroup implements IGroup {
  constructor(public relays: IRelay[]) {}

  /** Takes an array of observables and only emits EOSE when all observables have emitted EOSE */
  protected mergeEOSE(...requests: Observable<SubscriptionResponse>[]) {
    // Create stream of events only
    const events = merge(...requests).pipe(onlyEvents());

    // Create stream that emits EOSE when all relays have sent EOSE
    const eose = merge(
      // Create a new map of requests that only emits EOSE
      ...requests.map((observable) => observable.pipe(completeOnEose(), ignoreElements())),
    ).pipe(
      // When all relays have sent EOSE, emit EOSE
      endWith("EOSE" as const),
    );

    return merge(events, eose);
  }

  /** Make a request to all relays */
  req(filters: Filter | Filter[], id = nanoid(8)): Observable<SubscriptionResponse> {
    const requests = this.relays.map((relay) =>
      relay.req(filters, id).pipe(
        // Ignore connection errors
        catchError(() => of("EOSE" as const)),
      ),
    );

    // Merge events and the single EOSE stream
    return this.mergeEOSE(...requests);
  }

  /** Send an event to all relays */
  event(event: NostrEvent): Observable<PublishResponse> {
    return merge(
      ...this.relays.map((relay) =>
        relay.event(event).pipe(
          // Catch error and return as PublishResponse
          catchError((err) =>
            of({ ok: false, from: relay.url, message: err?.message || "Unknown error" } satisfies PublishResponse),
          ),
        ),
      ),
    );
  }

  /** Publish an event to all relays with retries ( default 3 retries ) */
  publish(event: NostrEvent, opts?: PublishOptions): Observable<PublishResponse> {
    return merge(
      ...this.relays.map((relay) =>
        relay.publish(event, opts).pipe(
          // Catch error and return as PublishResponse
          catchError((err) =>
            of({ ok: false, from: relay.url, message: err?.message || "Unknown error" } satisfies PublishResponse),
          ),
        ),
      ),
    );
  }

  /** Request events from all relays with retries ( default 3 retries ) */
  request(filters: Filter | Filter[], opts?: RequestOptions): Observable<NostrEvent> {
    return merge(
      ...this.relays.map((relay) =>
        relay.request(filters, opts).pipe(
          // Ignore individual connection errors
          catchError(() => EMPTY),
        ),
      ),
    );
  }

  /** Open a subscription to all relays with retries ( default 3 retries ) */
  subscription(filters: Filter | Filter[], opts?: SubscriptionOptions): Observable<SubscriptionResponse> {
    return this.mergeEOSE(
      ...this.relays.map((relay) =>
        relay.subscription(filters, opts).pipe(
          // Ignore individual connection errors
          catchError(() => EMPTY),
        ),
      ),
    );
  }
}
