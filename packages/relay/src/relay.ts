import { logger } from "applesauce-core";
import { simpleTimeout } from "applesauce-core/observable";
import { nanoid } from "nanoid";
import { nip42, type Filter, type NostrEvent } from "nostr-tools";
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  defer,
  filter,
  from,
  ignoreElements,
  map,
  merge,
  mergeMap,
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
  tap,
  throwError,
  timeout,
  timer,
} from "rxjs";
import { webSocket, WebSocketSubject, WebSocketSubjectConfig } from "rxjs/webSocket";

import { RelayInformation } from "nostr-tools/nip11";
import { completeOnEose } from "./operators/complete-on-eose.js";
import { markFromRelay } from "./operators/mark-from-relay.js";
import {
  AuthSigner,
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
  /** Whether the client is authenticated with the relay */
  authenticated$ = new BehaviorSubject(false);
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
    return this.authenticated$.value;
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

  // subjects that track if an "auth-required" message has been received for REQ or EVENT
  protected receivedAuthRequiredForReq = new BehaviorSubject(false);
  protected receivedAuthRequiredForEvent = new BehaviorSubject(false);

  // Computed observables that track if auth is required for REQ or EVENT
  protected authRequiredForReq: Observable<boolean>;
  protected authRequiredForEvent: Observable<boolean>;

  protected resetState() {
    // NOTE: only update the values if they need to be changed, otherwise this will cause an infinite loop
    if (this.challenge$.value !== null) this.challenge$.next(null);
    if (this.authenticated$.value) this.authenticated$.next(false);
    if (this.notices$.value.length > 0) this.notices$.next([]);

    if (this.receivedAuthRequiredForReq.value) this.receivedAuthRequiredForReq.next(false);
    if (this.receivedAuthRequiredForEvent.value) this.receivedAuthRequiredForEvent.next(false);
  }

  /** An internal observable that is responsible for watching all messages and updating state */
  protected watchTower: Observable<never>;

  constructor(
    public url: string,
    opts?: RelayOptions,
  ) {
    this.log = this.log.extend(url);

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
    this.authRequiredForReq = combineLatest([this.receivedAuthRequiredForReq, this.limitations$]).pipe(
      map(([received, limitations]) => received || limitations?.auth_required === true),
      tap((required) => required && this.log("Auth required for REQ")),
      shareReplay(1),
    );
    this.authRequiredForEvent = combineLatest([this.receivedAuthRequiredForEvent, this.limitations$]).pipe(
      map(([received, limitations]) => received || limitations?.auth_required === true),
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

  /** Wait for ready and authenticated */
  protected waitForAuth<T extends unknown = unknown>(
    // NOTE: require BehaviorSubject so it always has a value
    requireAuth: Observable<boolean>,
    observable: Observable<T>,
  ): Observable<T> {
    return combineLatest([requireAuth, this.authenticated$]).pipe(
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
  next(message: any) {
    this.socket.next(message);
  }

  /** Create a REQ observable that emits events or "EOSE" or errors */
  req(filters: Filter | Filter[], id = nanoid()): Observable<SubscriptionResponse> {
    const request = this.socket.multiplex(
      () => (Array.isArray(filters) ? ["REQ", id, ...filters] : ["REQ", id, filters]),
      () => ["CLOSE", id],
      (message) => (message[0] === "EVENT" || message[0] === "CLOSED" || message[0] === "EOSE") && message[1] === id,
    );

    // Start the watch tower with the observable
    const withWatchTower = merge(this.watchTower, request);

    const observable = withWatchTower.pipe(
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
    return this.waitForReady(this.waitForAuth(this.authRequiredForReq, observable));
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

    // Start the watch tower with the observable
    const withWatchTower = merge(this.watchTower, base);

    // Add complete operators
    const observable = withWatchTower.pipe(
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
    else return this.waitForReady(this.waitForAuth(this.authRequiredForEvent, observable));
  }

  /** send and AUTH message */
  auth(event: NostrEvent): Observable<PublishResponse> {
    return this.event(event, "AUTH").pipe(
      // update authenticated
      tap((result) => this.authenticated$.next(result.ok)),
    );
  }

  /** Authenticate with the relay using a signer */
  authenticate(signer: AuthSigner): Observable<PublishResponse> {
    if (!this.challenge) throw new Error("Have not received authentication challenge");

    const p = signer.signEvent(nip42.makeAuthEvent(this.url, this.challenge));
    const start = p instanceof Promise ? from(p) : of(p);

    return start.pipe(switchMap((event) => this.auth(event)));
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
  publish(event: NostrEvent, opts?: PublishOptions): Observable<PublishResponse> {
    return this.event(event).pipe(
      mergeMap((result) => {
        // If the relay responds with auth-required, throw an error for the retry operator to handle
        if (result.ok === false && result.message?.startsWith("auth-required:"))
          return throwError(() => new Error(result.message));

        return of(result);
      }),
      // Retry the publish until it succeeds or the number of retries is reached
      retry(opts?.retries ?? 3),
    );
  }

  /** Static method to fetch the NIP-11 information document for a relay */
  static fetchInformationDocument(url: string): Observable<RelayInformation | null> {
    return from(fetch(url, { headers: { Accept: "application/nostr+json" } }).then((res) => res.json())).pipe(
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
