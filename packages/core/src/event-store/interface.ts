import { Filter, NostrEvent } from "nostr-tools";
import { Observable } from "rxjs";

export interface ISyncEventStore {
  hasEvent(id: string): boolean;
  hasReplaceable(kind: number, pubkey: string, identifier?: string): boolean;

  getEvent(id: string): NostrEvent | undefined;
  getReplaceable(kind: number, pubkey: string, identifier?: string): NostrEvent | undefined;
  getReplaceableHistory(kind: number, pubkey: string, identifier?: string): NostrEvent[] | undefined;

  getAll(filters: Filter | Filter[]): Set<NostrEvent>;
  getTimeline(filters: Filter | Filter[]): NostrEvent[];
}

export interface IStreamEventStore {
  inserts: Observable<NostrEvent>;
  updates: Observable<NostrEvent>;
  removes: Observable<NostrEvent>;

  filters(filters: Filter | Filter[]): Observable<NostrEvent>;

  updated(id: string | NostrEvent): Observable<NostrEvent>;
  removed(id: string): Observable<never>;

  event(id: string): Observable<NostrEvent | undefined>;
  events(ids: string[]): Observable<Record<string, NostrEvent>>;
  replaceable(kind: number, pubkey: string, identifier?: string): Observable<NostrEvent | undefined>;
  replaceableSet(
    pointers: { kind: number; pubkey: string; identifier?: string }[],
  ): Observable<Record<string, NostrEvent>>;
  timeline(filters: Filter | Filter[], includeOldVersion?: boolean): Observable<NostrEvent[]>;
}

export interface IEventStore extends ISyncEventStore, IStreamEventStore {
  add(event: NostrEvent, fromRelay?: string): NostrEvent | null;
  remove(event: string | NostrEvent): boolean;
  update(event: NostrEvent): void;
}
