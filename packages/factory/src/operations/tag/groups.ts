import { GroupPointer } from "applesauce-core/helpers/groups";

import { createGroupTagFromGroupPointer } from "../../helpers/groups.js";
import { TagOperation } from "../../event-factory.js";

/** Adds a "group" tag to a list */
export function addGroupTag(group: GroupPointer): TagOperation {
  return (tags) => {
    // remove existing tag
    tags = tags.filter((t) => !(t[0] === "group" && t[1] === group.id && t[2] === group.relay));

    return [...tags, createGroupTagFromGroupPointer(group)];
  };
}

/** Removes a "group" tag from a list */
export function removeGroupTag(group: GroupPointer): TagOperation {
  return (tags) => tags.filter((tag) => tag[0] === "group" && tag[1] === group.id && tag[2] === group.relay);
}
