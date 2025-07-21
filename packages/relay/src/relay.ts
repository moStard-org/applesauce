import { logger } from "applesauce-core";
import { simpleTimeout } from "applesauce-core/observable";
import { nanoid } from "nanoid";
import { nip42, type Filter, type NostrEvent } from "nostr-tools";
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  defer,
  endWith,
  filter,
  finalize,
  from,
  ignoreElements,
  isObservable,
  lastValueFrom,
  map,
  merge,
  mergeMap,
  mergeWith,
  NEVER,
  Observable,
  of,
  retry,
  scan,
  share,
  shareReplay,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
  throwError,
  timeout,
  timer,
} from "rxjs";
import { webSocket, WebSocketSubject, WebSocketSubjectConfig } from "rxjs/webSocket";

import { ensureHttpURL } from "applesauce-core/helpers";
import { RelayInformation } from "nostr-tools/nip11";
import { completeOnEose } from "./operators/complete-on-eose.js";
import { markFromRelay } from "./operators/mark-from-relay.js";
import {
  AuthSigner,
  FilterInput,
  IRelay,
  PublishOptions,
  PublishResponse,
  RequestOptions,
  SubscriptionOptions,
  SubscriptionResponse,
} from "./types.js";

/** An error that is thrown when a REQ is closed from the relay side */
export class ReqCloseError extends Error {}

export type RelayOptions = {
  WebSocket?: WebSocketSubjectConfig<any>["WebSocketCtor"];
};

export class Relay implements IRelay {
  protected log: typeof logger = logger.extend("Relay");
  protected socket: WebSocketSubject<any>;

  /** Whether the relay is ready for subscriptions or event publishing. setting this to false will cause all .req and .event observables to hang until the relay is ready */
  protected ready$ = new BehaviorSubject(true);

  /** A method that returns an Observable that emits when the relay should reconnect */
  reconnectTimer: (error: CloseEvent | Error, attempts: number) => Observable<number>;

  /** How many times the relay has tried to reconnect */
  attempts$ = new BehaviorSubject(0);
  /** Whether the relay is connected */
  connected$ = new BehaviorSubject(false);
  /** The authentication challenge string from the relay */
  challenge$ = new BehaviorSubject<string | null>(null);
  /** Boolean authentication state (will be false if auth failed) */
  authenticated$: Observable<boolean>;
  /** The response to the last AUTH message sent to the relay */
  authenticationResponse$ = new BehaviorSubject<PublishResponse | null>(null);
  /** The notices from the relay */
  notices$ = new BehaviorSubject<string[]>([]);
  /** The last connection error */
  error$ = new BehaviorSubject<Error | null>(null);

  /**
   * A passive observable of all messages from the relay
   * @note Subscribing to this will not connect to the relay
   */
  message$: Observable<any>;
  /**
   * A passive observable of NOTICE messages from the relay
   * @note Subscribing to this will not connect to the relay
   */
  notice$: Observable<string>;

  /** An observable that emits the NIP-11 information document for the relay */
  information$: Observable<RelayInformation | null>;
  protected _nip11: RelayInformation | null = null;

  /** An observable that emits the limitations for the relay */
  limitations$: Observable<RelayInformation["limitation"] | null>;

  // sync state
  get connected() {
    return this.connected$.value;
  }
  get challenge() {
    return this.challenge$.value;
  }
  get notices() {
    return this.notices$.value;
  }
  get authenticated() {
    return this.authenticationResponse?.ok === true;
  }
  get authenticationResponse() {
    return this.authenticationResponse$.value;
  }
  get information() {
    return this._nip11;
  }

  /** If an EOSE message is not seen in this time, emit one locally  */
  eoseTimeout = 10_000;
  /** How long to wait for an OK message from the relay */
  eventTimeout = 10_000;

  /** How long to keep the connection alive after nothing is subscribed */
  keepAlive = 30_000;

  // Subjects that track if an "auth-required" message has been received for REQ or EVENT
  protected receivedAuthRequiredForReq = new BehaviorSubject(false);
  protected receivedAuthRequiredForEvent = new BehaviorSubject(false);

  // Computed observables that track if auth is required for REQ or EVENT
  authRequiredForRead$: Observable<boolean>;
  authRequiredForPublish$: Observable<boolean>;

  protected resetState() {
    // NOTE: only update the values if they need to be changed, otherwise this will cause an infinite loop
    if (this.challenge$.value !== null) this.challenge$.next(null);
    if (this.authenticationResponse$.value) this.authenticationResponse$.next(null);
    if (this.notices$.value.length > 0) this.notices$.next([]);

    if (this.receivedAuthRequiredForReq.value) this.receivedAuthRequiredForReq.next(false);
    if (this.receivedAuthRequiredForEvent.value) this.receivedAuthRequiredForEvent.next(false);
  }

  /** An internal observable that is responsible for watching all messages and updating state, subscribing to it will trigger a connection to the relay */
  protected watchTower: Observable<never>;

  constructor(
    public url: string,
    opts?: RelayOptions,
  ) {
    this.log = this.log.extend(url);

    // Create an observable that tracks boolean authentication state
    this.authenticated$ = this.authenticationResponse$.pipe(map((response) => response?.ok === true));

    /** Use the static method to create a new reconnect method for this relay */
    this.reconnectTimer = Relay.createReconnectTimer(url);

    this.socket = webSocket({
      url,
      openObserver: {
        next: () => {
          this.log("Connected");
          this.connected$.next(true);
          this.attempts$.next(0);
          this.error$.next(null);
          this.resetState();
        },
      },
      closeObserver: {
        next: (event) => {
          this.log("Disconnected");
          this.connected$.next(false);
          this.attempts$.next(this.attempts$.value + 1);
          this.resetState();

          // Start the reconnect timer if the connection was not closed cleanly
          if (!event.wasClean) this.startReconnectTimer(event);
        },
      },
      WebSocketCtor: opts?.WebSocket,
    });

    // Create an observable to fetch the NIP-11 information document
    this.information$ = defer(() => {
      this.log("Fetching NIP-11 information document");
      return Relay.fetchInformationDocument(this.url);
    }).pipe(
      // if the fetch fails, return null
      catchError(() => of(null)),
      // cache the result
      shareReplay(1),
      // update the internal state
      tap((info) => (this._nip11 = info)),
    );
    this.limitations$ = this.information$.pipe(map((info) => info?.limitation));

    // Create observables that track if auth is required for REQ or EVENT
    this.authRequiredForRead$ = this.receivedAuthRequiredForReq.pipe(
      tap((required) => required && this.log("Auth required for REQ")),
      shareReplay(1),
    );
    this.authRequiredForPublish$ = this.receivedAuthRequiredForEvent.pipe(
      tap((required) => required && this.log("Auth required for EVENT")),
      shareReplay(1),
    );

    // Update the notices state
    const listenForNotice = this.socket.pipe(
      // listen for NOTICE messages
      filter((m) => Array.isArray(m) && m[0] === "NOTICE"),
      // pick the string out of the message
      map((m) => m[1]),
      // Track all notices
      scan((acc, notice) => [...acc, notice], [] as string[]),
      // Update the notices state
      tap((notices) => this.notices$.next(notices)),
    );

    // Update the challenge state
    const ListenForChallenge = this.socket.pipe(
      // listen for AUTH messages
      filter((message) => message[0] === "AUTH"),
      // pick the challenge string out
      map((m) => m[1]),
      // Update the challenge state
      tap((challenge) => {
        this.log("Received AUTH challenge", challenge);
        this.challenge$.next(challenge);
      }),
    );

    const allMessagesSubject = new Subject<any>();
    const listenForAllMessages = this.socket.pipe(tap((message) => allMessagesSubject.next(message)));

    // Create passive observables for messages and notices
    this.message$ = allMessagesSubject.asObservable();
    this.notice$ = this.message$.pipe(
      // listen for NOTICE messages
      filter((m) => Array.isArray(m) && m[0] === "NOTICE"),
      // pick the string out of the message
      map((m) => m[1]),
    );

    // Merge all watchers
    this.watchTower = this.ready$.pipe(
      switchMap((ready) => {
        if (!ready) return NEVER;

        // Only start the watch tower if the relay is ready
        return merge(listenForAllMessages, listenForNotice, ListenForChallenge, this.information$).pipe(
          // Never emit any values
          ignoreElements(),
          // Start the reconnect timer if the connection has an error
          catchError((error) => {
            this.startReconnectTimer(error instanceof Error ? error : new Error("Connection error"));
            return NEVER;
          }),
          // Add keep alive timer to the connection
          share({ resetOnRefCountZero: () => timer(this.keepAlive) }),
        );
      }),
      // There should only be a single watch tower
      share(),
    );
  }

  /** Set ready = false and start the reconnect timer */
  protected startReconnectTimer(error: Error | CloseEvent) {
    if (!this.ready$.value) return;

    this.error$.next(error instanceof Error ? error : new Error("Connection error"));
    this.ready$.next(false);
    this.reconnectTimer(error, this.attempts$.value)
      .pipe(take(1))
      .subscribe(() => this.ready$.next(true));
  }

  /** Wait for authentication state, make connection and then wait for authentication if required */
  protected waitForAuth<T extends unknown = unknown>(
    // NOTE: require BehaviorSubject so it always has a value
    requireAuth: Observable<boolean>,
    observable: Observable<T>,
  ): Observable<T> {
    return combineLatest([requireAuth, this.authenticated$]).pipe(
      // Once the auth state is known, make a connection and watch for auth challenges
      mergeWith(this.watchTower),
      // wait for auth not required or authenticated
      filter(([required, authenticated]) => !required || authenticated),
      // complete after the first value so this does not repeat
      take(1),
      // switch to the observable
      switchMap(() => observable),
    );
  }

  /** Wait for the relay to be ready to accept connections */
  protected waitForReady<T extends unknown = unknown>(observable: Observable<T>): Observable<T> {
    // Don't wait if the relay is already ready
    if (this.ready$.value) return observable;
    else
      return this.ready$.pipe(
        // wait for ready to be true
        filter((ready) => ready),
        // complete after the first value so this does not repeat
        take(1),
        // switch to the observable
        switchMap(() => observable),
      );
  }

  multiplex<T>(open: () => any, close: () => any, filter: (message: any) => boolean): Observable<T> {
    return this.socket.multiplex(open, close, filter);
  }

  /** Send a message to the relay */
  send(message: any) {
    this.socket.next(message);
  }

  /** Create a REQ observable that emits events or "EOSE" or errors */
  req(filters: FilterInput, id = nanoid()): Observable<SubscriptionResponse> {
    // Convert filters input into an observable, if its a normal value merge it with NEVER so it never completes
    const input = isObservable(filters) ? filters : merge(of(filters), NEVER);

    // Create an observable that completes when the upstream observable completes
    const complete = input.pipe(ignoreElements(), endWith(null));

    // Create an observable that filters responses from the relay to just the ones for this REQ
    const messages: Observable<any[]> = this.socket.pipe(
      filter((m) => Array.isArray(m) && (m[0] === "EVENT" || m[0] === "CLOSED" || m[0] === "EOSE") && m[1] === id),
    );

    // Create an observable that controls sending the filters and closing the REQ
    const control = input.pipe(
      // Send the filters when they change
      tap((filters) => this.socket.next(Array.isArray(filters) ? ["REQ", id, ...filters] : ["REQ", id, filters])),
      // Close the req when unsubscribed
      finalize(() => this.socket.next(["CLOSE", id])),
      // Once filters have been sent, switch to listening for messages
      switchMap(() => messages),
    );

    // Start the watch tower with the observables
    const observable = merge(this.watchTower, control).pipe(
      // Complete the subscription when the input is completed
      takeUntil(complete),
      // Map the messages to events, EOSE, or throw an error
      map<any[], SubscriptionResponse>((message) => {
        if (message[0] === "EOSE") return "EOSE";
        else if (message[0] === "CLOSED") throw new ReqCloseError(message[2]);
        else return message[2] as NostrEvent;
      }),
      catchError((error) => {
        // Set REQ auth required if the REQ is closed with auth-required
        if (
          error instanceof ReqCloseError &&
          error.message.startsWith("auth-required") &&
          !this.receivedAuthRequiredForReq.value
        ) {
          this.log("Auth required for REQ");
          this.receivedAuthRequiredForReq.next(true);
        }

        // Pass the error through
        return throwError(() => error);
      }),
      // mark events as from relays
      markFromRelay(this.url),
      // if no events are seen in 10s, emit EOSE
      // TODO: this should emit EOSE event if events are seen, the timeout should be for only the EOSE message
      timeout({
        first: this.eoseTimeout,
        with: () => merge(of<SubscriptionResponse>("EOSE"), NEVER),
      }),
      // Only create one upstream subscription
      share(),
    );

    // Wait for auth if required and make sure to start the watch tower
    return this.waitForReady(this.waitForAuth(this.authRequiredForRead$, observable));
  }

  /** Send an EVENT or AUTH message and return an observable of PublishResponse that completes or errors */
  event(event: NostrEvent, verb: "EVENT" | "AUTH" = "EVENT"): Observable<PublishResponse> {
    const base: Observable<PublishResponse> = defer(() => {
      // Send event when subscription starts
      this.socket.next([verb, event]);

      return this.socket.pipe(
        filter((m) => m[0] === "OK" && m[1] === event.id),
        // format OK message
        map((m) => ({ ok: m[2] as boolean, message: m[3] as string, from: this.url })),
      );
    });

    // Start the watch tower and add complete operators
    const observable = merge(this.watchTower, base).pipe(
      // complete on first value
      take(1),
      // listen for OK auth-required
      tap(({ ok, message }) => {
        if (ok === false && message?.startsWith("auth-required") && !this.receivedAuthRequiredForEvent.value) {
          this.log("Auth required for publish");
          this.receivedAuthRequiredForEvent.next(true);
        }
      }),
      // if no message is seen in 10s, emit EOSE
      timeout({
        first: this.eventTimeout,
        with: () => of<PublishResponse>({ ok: false, from: this.url, message: "Timeout" }),
      }),
      // Only create one upstream subscription
      share(),
    );

    // skip wait for auth if verb is AUTH
    if (verb === "AUTH") return this.waitForReady(observable);
    else return this.waitForReady(this.waitForAuth(this.authRequiredForPublish$, observable));
  }

  /** send and AUTH message */
  auth(event: NostrEvent): Promise<PublishResponse> {
    return lastValueFrom(
      this.event(event, "AUTH").pipe(
        // update authenticated
        tap((result) => this.authenticationResponse$.next(result)),
      ),
    );
  }

  /** Authenticate with the relay using a signer */
  authenticate(signer: AuthSigner): Promise<PublishResponse> {
    if (!this.challenge) throw new Error("Have not received authentication challenge");

    const p = signer.signEvent(nip42.makeAuthEvent(this.url, this.challenge));
    const start = p instanceof Promise ? from(p) : of(p);

    return lastValueFrom(start.pipe(switchMap((event) => this.auth(event))));
  }

  /** Creates a REQ that retries when relay errors ( default 3 retries ) */
  subscription(filters: Filter | Filter[], opts?: SubscriptionOptions): Observable<SubscriptionResponse> {
    return this.req(filters, opts?.id).pipe(
      // Retry on connection errors
      retry({ count: opts?.retries ?? 3, resetOnSuccess: true }),
    );
  }

  /** Makes a single request that retires on errors and completes on EOSE */
  request(filters: Filter | Filter[], opts?: RequestOptions): Observable<NostrEvent> {
    return this.req(filters, opts?.id).pipe(
      // Retry on connection errors
      retry(opts?.retries ?? 3),
      // Complete when EOSE is received
      completeOnEose(),
    );
  }

  /** Publishes an event to the relay and retries when relay errors or responds with auth-required ( default 3 retries ) */
  publish(event: NostrEvent, opts?: PublishOptions): Promise<PublishResponse> {
    return lastValueFrom(
      this.event(event).pipe(
        mergeMap((result) => {
          // If the relay responds with auth-required, throw an error for the retry operator to handle
          if (result.ok === false && result.message?.startsWith("auth-required:"))
            return throwError(() => new Error(result.message));

          return of(result);
        }),
        // Retry the publish until it succeeds or the number of retries is reached
        retry(opts?.retries ?? 3),
      ),
    );
  }

  /** Static method to fetch the NIP-11 information document for a relay */
  static fetchInformationDocument(url: string): Observable<RelayInformation | null> {
    return from(
      fetch(ensureHttpURL(url), { headers: { Accept: "application/nostr+json" } }).then((res) => res.json()),
    ).pipe(
      // if the fetch fails, return null
      catchError(() => of(null)),
      // timeout after 10s
      simpleTimeout(10_000),
    );
  }

  /** Static method to create a reconnection method for each relay */
  static createReconnectTimer(_relay: string) {
    return (_error?: Error | CloseEvent, tries = 0) => {
      // Calculate delay with exponential backoff: 2^attempts * 1000ms
      // with a maximum delay of 5 minutes (300000ms)
      const delay = Math.min(Math.pow(1.5, tries) * 1000, 300000);

      // Return a timer that will emit after the calculated delay
      return timer(delay);
    };
  }
}
