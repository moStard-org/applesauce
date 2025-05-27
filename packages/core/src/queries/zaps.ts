import { map } from "rxjs";
import { AddressPointer, EventPointer } from "nostr-tools/nip19";
import { kinds, NostrEvent } from "nostr-tools";

import { Query } from "../query-store/index.js";
import { getCoordinateFromAddressPointer, isAddressPointer } from "../helpers/pointers.js";
import { isValidZap } from "../helpers/zap.js";

/** A query that gets all zap events for an event */
export function EventZapsQuery(id: string | EventPointer | AddressPointer): Query<NostrEvent[]> {
  return (events) => {
    if (isAddressPointer(id)) {
      return events
        .timeline([{ kinds: [kinds.Zap], "#a": [getCoordinateFromAddressPointer(id)] }])
        .pipe(map((events) => events.filter(isValidZap)));
    } else {
      id = typeof id === "string" ? id : id.id;
      return events.timeline([{ kinds: [kinds.Zap], "#e": [id] }]).pipe(map((events) => events.filter(isValidZap)));
    }
  };
}

/** Returns all zaps sent by a user */
export function SentZapsQuery(pubkey: string): Query<NostrEvent[]> {
  return (events) => events.timeline([{ kinds: [kinds.Zap], authors: [pubkey] }]);
}

/** Returns all zaps received by a user */
export function ReceivedZapsQuery(pubkey: string): Query<NostrEvent[]> {
  return (events) => events.timeline([{ kinds: [kinds.Zap], "#a": [pubkey] }]);
}
