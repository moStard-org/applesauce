import { Filter, kinds, NostrEvent } from "nostr-tools";
import { AddressPointer, EventPointer } from "nostr-tools/nip19";
import { isAddressableKind } from "nostr-tools/kinds";
import { map } from "rxjs/operators";

import { Query } from "../query-store/index.js";
import { getNip10References, interpretThreadTags, ThreadReferences } from "../helpers/threading.js";
import { getCoordinateFromAddressPointer, isAddressPointer, isEventPointer } from "../helpers/pointers.js";
import { getEventUID, createReplaceableAddress, getTagValue, isEvent } from "../helpers/event.js";
import { COMMENT_KIND } from "../helpers/comment.js";

export type Thread = {
  root?: ThreadItem;
  all: Map<string, ThreadItem>;
};
export type ThreadItem = {
  /** underlying nostr event */
  event: NostrEvent;
  refs: ThreadReferences;
  /** the thread root, according to this event */
  root?: ThreadItem;
  /** the parent event this is replying to */
  parent?: ThreadItem;
  /** direct child replies */
  replies: Set<ThreadItem>;
};

export type ThreadQueryOptions = {
  kinds?: number[];
};

const defaultOptions = {
  kinds: [kinds.ShortTextNote],
};

export function ThreadQuery(root: string | AddressPointer | EventPointer, opts?: ThreadQueryOptions): Query<Thread> {
  const parentReferences = new Map<string, Set<ThreadItem>>();
  const items = new Map<string, ThreadItem>();

  const { kinds } = { ...defaultOptions, ...opts };

  let rootUID = "";
  const rootFilter: Filter = {};
  const replyFilter: Filter = { kinds };

  if (isAddressPointer(root)) {
    rootUID = getCoordinateFromAddressPointer(root);
    rootFilter.kinds = [root.kind];
    rootFilter.authors = [root.pubkey];
    rootFilter["#d"] = [root.identifier];

    replyFilter["#a"] = [rootUID];
  } else if (typeof root === "string") {
    rootUID = root;
    rootFilter.ids = [root];
    replyFilter["#e"] = [root];
  } else {
    rootUID = root.id;
    rootFilter.ids = [root.id];
    replyFilter["#e"] = [root.id];
  }

  return (events) =>
    events.filters([rootFilter, replyFilter]).pipe(
      map((event) => {
        if (!items.has(getEventUID(event))) {
          const refs = getNip10References(event);

          const replies = parentReferences.get(getEventUID(event)) || new Set<ThreadItem>();
          const item: ThreadItem = { event, refs, replies };

          for (const child of replies) {
            child.parent = item;
          }

          // add item to parent
          if (refs.reply?.e || refs.reply?.a) {
            let uid = refs.reply.e ? refs.reply.e.id : getCoordinateFromAddressPointer(refs.reply.a);

            item.parent = items.get(uid);
            if (item.parent) {
              item.parent.replies.add(item);
            } else {
              // parent isn't created yet, store ref for later
              let set = parentReferences.get(uid);
              if (!set) {
                set = new Set();
                parentReferences.set(uid, set);
              }

              set.add(item);
            }
          }

          // add item to map
          items.set(getEventUID(event), item);
        }

        return { root: items.get(rootUID), all: items };
      }),
    );
}

/** A query that gets all legacy and NIP-10, and NIP-22 replies for an event */
export function RepliesQuery(event: NostrEvent, overrideKinds?: number[]): Query<NostrEvent[]> {
  return (events) => {
    const kinds = overrideKinds || event.kind === 1 ? [1, COMMENT_KIND] : [COMMENT_KIND];
    const filter: Filter = { kinds };

    if (isEvent(parent) || isEventPointer(event)) filter["#e"] = [event.id];

    const address = isAddressableKind(event.kind)
      ? createReplaceableAddress(event.kind, event.pubkey, getTagValue(event, "d"))
      : undefined;
    if (address) {
      filter["#a"] = [address];
    }

    return events.timeline(filter).pipe(
      map((events) => {
        return events.filter((e) => {
          const refs = interpretThreadTags(e.tags);
          return refs.reply?.e?.[1] === event.id || refs.reply?.a?.[1] === address;
        });
      }),
    );
  };
}
