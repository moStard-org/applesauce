import { EventOperation } from "../../event-factory.js";
import { includeNameValueTag } from "./tags.js";

/** Includes the nip-04 direct message "p" tag */
export function includeLegacyDirectMessageAddressTag(pubkey: string): EventOperation {
  return includeNameValueTag(["p", pubkey]);
}
