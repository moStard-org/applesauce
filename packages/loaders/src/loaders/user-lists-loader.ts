import { IEventStore, mapEventsToStore } from "applesauce-core";
import { mergeRelaySets } from "applesauce-core/helpers";
import { Filter, kinds, NostrEvent } from "nostr-tools";
import { ProfilePointer } from "nostr-tools/nip19";
import { EMPTY, identity, merge, Observable } from "rxjs";

import { NostrRequest } from "../types.js";
import { CacheRequest } from "./loader.js";

/** A list of NIP-51 list kinds that most clients will use */
export const COMMON_LIST_KINDS = [kinds.Contacts, kinds.Mutelist, kinds.Pinlist, kinds.BookmarkList];

/** A list of NIP-51 set kinds that most clients will use */
export const COMMON_SET_KINDS = [kinds.Bookmarksets, kinds.Followsets];

/** A loader that takes a user profile and loads their NIP-51 sets and lists */
export type UserListsLoader = (user: ProfilePointer) => Observable<NostrEvent>;

export type UserListsLoaderOptions = Partial<{
  /** An array of NIP-51 kinds to load */
  kinds: number[];
  /** A method used to load events from a local cache */
  cacheRequest?: CacheRequest;
  /** An array of extra relay to load from */
  extraRelays?: string[];
  /** An event store used to deduplicate events */
  eventStore: IEventStore;
}>;

/**
 * A special address loader that can request addressable events without specifying the identifier
 * @todo this does not have a buffer, it may be useful to have one
 */
export function userListsLoader(request: NostrRequest, opts?: UserListsLoaderOptions): UserListsLoader {
  return (user: ProfilePointer) => {
    const filter: Filter = {
      kinds: opts?.kinds || [...COMMON_LIST_KINDS, ...COMMON_SET_KINDS],
      authors: [user.pubkey],
    };

    // Merge extra relays with user relays
    const relays = opts?.extraRelays ? mergeRelaySets(user.relays, opts.extraRelays) : user.relays;

    return merge(
      // Load from cache
      opts?.cacheRequest?.([filter]) ?? EMPTY,
      // Load from relays
      relays ? request(relays, [filter]) : EMPTY,
    ).pipe(
      // If event store is set, deduplicate events
      opts?.eventStore ? mapEventsToStore(opts.eventStore) : identity,
    );
  };
}
