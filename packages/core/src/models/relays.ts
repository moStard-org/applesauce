import { kinds } from "nostr-tools";
import { AddressPointer } from "nostr-tools/nip19";
import { identity, map } from "rxjs";

import { FAVORITE_RELAYS_KIND, getAddressPointersFromList, getRelaysFromList, ReadListTags } from "../helpers/lists.js";
import { watchEventUpdates } from "../observable/watch-event-updates.js";
import { Model } from "../event-store/interface.js";

/**
 * A model that returns all favorite relays for a pubkey
 * @param pubkey - The pubkey to get the favorite relays for
 * @param type - Which types of tags to read
 */
export function FavoriteRelaysModel(pubkey: string, type?: ReadListTags): Model<string[] | undefined> {
  return (events) => {
    return events.replaceable(FAVORITE_RELAYS_KIND, pubkey).pipe(
      type !== "public" ? watchEventUpdates(events) : map(identity),
      map((e) => e && getRelaysFromList(e, type)),
    );
  };
}

/**
 * A model that returns all favorite relay sets for a pubkey
 * @param pubkey - The pubkey to get the favorite relay sets for
 * @param type - Which types of tags to read
 */
export function FavoriteRelaySetsModel(pubkey: string, type?: ReadListTags): Model<AddressPointer[] | undefined> {
  return (events) => {
    return events.replaceable(FAVORITE_RELAYS_KIND, pubkey).pipe(
      type !== "public" ? watchEventUpdates(events) : map(identity),
      map((e) => e && getAddressPointersFromList(e, type)),
    );
  };
}

/**
 * A model that returns all search relays for a pubkey
 * @param pubkey - The pubkey to get the search relays for
 * @param type - Which types of tags to read
 */
export function SearchRelaysModel(pubkey: string, type?: ReadListTags): Model<string[] | undefined> {
  return (events) => {
    return events.replaceable(kinds.SearchRelaysList, pubkey).pipe(
      type !== "public" ? watchEventUpdates(events) : map(identity),
      map((e) => e && getRelaysFromList(e, type)),
    );
  };
}

/**
 * A model that returns all blocked relays for a pubkey
 * @param pubkey - The pubkey to get the blocked relays for
 * @param type - Which types of tags to read
 */
export function BlockedRelaysModel(pubkey: string, type?: ReadListTags): Model<string[] | undefined> {
  return (events) => {
    return events.replaceable(kinds.BlockedRelaysList, pubkey).pipe(
      type !== "public" ? watchEventUpdates(events) : map(identity),
      map((e) => e && getRelaysFromList(e, type)),
    );
  };
}
