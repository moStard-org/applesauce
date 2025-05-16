import { EventOperation as EventOperation } from "../../event-factory.js";
import { removeSingletonTag, setSingletonTag } from "../tag/common.js";
import { modifyPublicTags } from "./tags.js";

/** Sets or removes the "title" tag on a NIP-51 list */
export function setListTitle(title: string | null): EventOperation {
  return modifyPublicTags(title === null ? removeSingletonTag("title") : setSingletonTag(["title", title], true));
}

/** Sets or removes the "image" tag on a NIP-51 list */
export function setListImage(image: string | null): EventOperation {
  return modifyPublicTags(image === null ? removeSingletonTag("image") : setSingletonTag(["image", image], true));
}

/** Sets or removes the "description" tag on a NIP-51 list */
export function setListDescription(description: string | null): EventOperation {
  return modifyPublicTags(
    description === null ? removeSingletonTag("description") : setSingletonTag(["description", description], true),
  );
}
