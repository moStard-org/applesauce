import { kinds } from "nostr-tools";
import { EventPointer } from "nostr-tools/nip19";
import { map } from "rxjs/operators";

import { Model } from "../event-store/interface.js";
import { getEventPointerFromETag } from "../helpers/pointers.js";
import { isETag, processTags } from "../helpers/tags.js";

/** A model that returns all pinned pointers for a user */
export function UserPinnedModel(pubkey: string): Model<EventPointer[] | undefined> {
  return (events) =>
    events
      .replaceable(kinds.Pinlist, pubkey)
      .pipe(map((event) => event && processTags(event.tags.filter(isETag), getEventPointerFromETag)));
}
