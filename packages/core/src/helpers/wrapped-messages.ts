import { Rumor } from "./gift-wraps.js";
import { getTagValue } from "./index.js";

/** Returns the subject of a warpped direct message */
export function getWrappedMessageSubject(message: Rumor): string | undefined {
  return getTagValue(message, "subject");
}

/** Returns the parent id of a wrapped direct message */
export function getWrappedMessageParent(message: Rumor): string | undefined {
  return getTagValue(message, "e");
}
