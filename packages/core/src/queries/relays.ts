import { kinds } from "nostr-tools";
import { AddressPointer } from "nostr-tools/nip19";
import { identity, map } from "rxjs";

import { FAVORITE_RELAYS_KIND, getAddressPointersFromList, getRelaysFromList, ReadListTags } from "../helpers/lists.js";
import { watchEventUpdates } from "../observable/watch-event-updates.js";
import { Query } from "../query-store/query-store.js";

/**
 * A query that returns all favorite relays for a pubkey
 * @param pubkey - The pubkey to get the favorite relays for
 * @param type - Which types of tags to read
 */
export function FavoriteRelays(pubkey: string, type?: ReadListTags): Query<string[] | undefined> {
  return (events) => {
    return events.replaceable(FAVORITE_RELAYS_KIND, pubkey).pipe(
      type !== "public" ? watchEventUpdates(events) : map(identity),
      map((e) => e && getRelaysFromList(e, type)),
    );
  };
}

/**
 * A query that returns all favorite relay sets for a pubkey
 * @param pubkey - The pubkey to get the favorite relay sets for
 * @param type - Which types of tags to read
 */
export function FavoriteRelaySets(pubkey: string, type?: ReadListTags): Query<AddressPointer[] | undefined> {
  return (events) => {
    return events.replaceable(FAVORITE_RELAYS_KIND, pubkey).pipe(
      type !== "public" ? watchEventUpdates(events) : map(identity),
      map((e) => e && getAddressPointersFromList(e, type)),
    );
  };
}

/**
 * A query that returns all search relays for a pubkey
 * @param pubkey - The pubkey to get the search relays for
 * @param type - Which types of tags to read
 */
export function SearchRelays(pubkey: string, type?: ReadListTags): Query<string[] | undefined> {
  return (events) => {
    return events.replaceable(kinds.SearchRelaysList, pubkey).pipe(
      type !== "public" ? watchEventUpdates(events) : map(identity),
      map((e) => e && getRelaysFromList(e, type)),
    );
  };
}

/**
 * A query that returns all blocked relays for a pubkey
 * @param pubkey - The pubkey to get the blocked relays for
 * @param type - Which types of tags to read
 */
export function BlockedRelays(pubkey: string, type?: ReadListTags): Query<string[] | undefined> {
  return (events) => {
    return events.replaceable(kinds.BlockedRelaysList, pubkey).pipe(
      type !== "public" ? watchEventUpdates(events) : map(identity),
      map((e) => e && getRelaysFromList(e, type)),
    );
  };
}
