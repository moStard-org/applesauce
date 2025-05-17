import { Filter, NostrEvent } from "nostr-tools";
import { isAddressableKind } from "nostr-tools/kinds";
import { COMMENT_KIND, getReplaceableAddress } from "../helpers/index.js";
import { Query } from "../query-store/index.js";

/** Returns all NIP-22 comment replies for the event */
export function CommentsQuery(parent: NostrEvent): Query<NostrEvent[]> {
  return (events) => {
    const filters: Filter[] = [{ kinds: [COMMENT_KIND], "#e": [parent.id] }];
    if (isAddressableKind(parent.kind)) filters.push({ kinds: [COMMENT_KIND], "#a": [getReplaceableAddress(parent)] });

    return events.timeline(filters);
  };
}
