import { EventOperation } from "../../types.js";
import { removeSingletonTag, setSingletonTag } from "../tag/index.js";
import { modifyPublicTags } from "./tags.js";

/** Adds or removes the NIP-70 "-" tag from an event */
export function setProtected(set = true): EventOperation {
  return modifyPublicTags(set ? setSingletonTag(["-"]) : removeSingletonTag("-"));
}
