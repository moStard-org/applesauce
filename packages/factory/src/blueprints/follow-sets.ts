import { kinds } from "nostr-tools";
import { ProfilePointer } from "nostr-tools/nip19";

import { blueprint } from "../event-factory.js";
import { setListDescription, setListImage, setListTitle } from "../operations/event/list.js";
import { modifyHiddenTags, modifyPublicTags } from "../operations/event/tags.js";
import { addPubkeyTag } from "../operations/tag/common.js";
import { EventBlueprint } from "../types.js";

/** Creates a new kind 30000 follow set */
export function FollowSetBlueprint(
  list?: {
    title?: string;
    description?: string;
    image?: string;
  },
  users?:
    | {
        public?: ProfilePointer[];
        hidden?: ProfilePointer[];
      }
    | ProfilePointer[],
): EventBlueprint {
  const userOperations = users
    ? Array.isArray(users)
      ? [modifyPublicTags(...users.map((p) => addPubkeyTag(p)))]
      : [
          users?.public ? modifyPublicTags(...users.public.map((p) => addPubkeyTag(p))) : undefined,
          users?.hidden ? modifyHiddenTags(...users.hidden.map((p) => addPubkeyTag(p))) : undefined,
        ]
    : [];

  return blueprint(
    kinds.Followsets,

    // set list info tags
    list?.title ? setListTitle(list.title) : undefined,
    list?.description ? setListDescription(list.description) : undefined,
    list?.image ? setListImage(list.image) : undefined,

    // add users to the list
    ...userOperations,
  );
}
