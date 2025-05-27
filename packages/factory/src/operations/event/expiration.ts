import { EventOperation } from "../../event-factory.js";
import { includeSingletonTag } from "./tags.js";

/** Sets the NIP-40 expiration timestamp for an event */
export function setExpirationTimestamp(timestamp: number): EventOperation {
  return includeSingletonTag(["expiration", timestamp.toString()], true);
}
