import { Filter, NostrEvent } from "nostr-tools";
import { Observable } from "rxjs";

export type FilterRequest = (filters: Filter[]) => Observable<NostrEvent>;
export type NostrRequest = (relays: string[], filters: Filter[]) => Observable<NostrEvent>;
