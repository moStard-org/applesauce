import { NostrEvent, type Filter } from "nostr-tools";
import { BehaviorSubject, Observable } from "rxjs";

import { RelayGroup } from "./group.js";
import { Relay, RelayOptions } from "./relay.js";
import {
  IPool,
  PublishResponse,
  PublishOptions,
  RequestOptions,
  SubscriptionOptions,
  SubscriptionResponse,
} from "./types.js";
import { normalizeURL } from "applesauce-core/helpers";

export class RelayPool implements IPool {
  groups$ = new BehaviorSubject<Map<string, RelayGroup>>(new Map());
  get groups() {
    return this.groups$.value;
  }

  relays$ = new BehaviorSubject<Map<string, Relay>>(new Map());
  get relays() {
    return this.relays$.value;
  }

  /** An array of relays to never connect to */
  blacklist = new Set<string>();

  constructor(public options?: RelayOptions) {}

  protected filterBlacklist(urls: string[]) {
    return urls.filter((url) => !this.blacklist.has(url));
  }

  /** Get or create a new relay connection */
  relay(url: string): Relay {
    // Normalize the url
    url = normalizeURL(url);

    // Check if the url is blacklisted
    if (this.blacklist.has(url)) throw new Error("Relay is on blacklist");

    // Check if the relay already exists
    let relay = this.relays.get(url);
    if (relay) return relay;

    // Create a new relay
    relay = new Relay(url, this.options);
    this.relays$.next(this.relays.set(url, relay));
    return relay;
  }

  /** Create a group of relays */
  group(relays: string[]): RelayGroup {
    // Normalize all urls
    relays = relays.map((url) => normalizeURL(url));

    // Filter out any blacklisted relays
    relays = this.filterBlacklist(relays);

    const key = relays.sort().join(",");
    let group = this.groups.get(key);
    if (group) return group;

    group = new RelayGroup(relays.map((url) => this.relay(url)));
    this.groups$.next(this.groups.set(key, group));
    return group;
  }

  /** Make a REQ to multiple relays that does not deduplicate events */
  req(relays: string[], filters: Filter | Filter[], id?: string): Observable<SubscriptionResponse> {
    return this.group(relays).req(filters, id);
  }

  /** Send an EVENT message to multiple relays */
  event(relays: string[], event: NostrEvent): Observable<PublishResponse> {
    return this.group(relays).event(event);
  }

  /** Publish an event to multiple relays */
  publish(relays: string[], event: NostrEvent, opts?: PublishOptions): Observable<PublishResponse> {
    return this.group(relays).publish(event, opts);
  }

  /** Request events from multiple relays */
  request(relays: string[], filters: Filter | Filter[], opts?: RequestOptions): Observable<NostrEvent> {
    return this.group(relays).request(filters, opts);
  }

  /** Open a subscription to multiple relays */
  subscription(
    relays: string[],
    filters: Filter | Filter[],
    opts?: SubscriptionOptions,
  ): Observable<SubscriptionResponse> {
    return this.group(relays).subscription(filters, opts);
  }
}
