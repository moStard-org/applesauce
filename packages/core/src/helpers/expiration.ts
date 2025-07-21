import { NostrEvent } from "nostr-tools";
import { getOrComputeCachedValue } from "./cache.js";
import { unixNow } from "./time.js";
import { getTagValue } from "./event-tags.js";

export const ExpirationTimestampSymbol = Symbol("expiration-timestamp");

/** Returns the NIP-40 expiration timestamp for an event */
export function getExpirationTimestamp(event: NostrEvent): number | undefined {
  return getOrComputeCachedValue(event, ExpirationTimestampSymbol, () => {
    const expiration = getTagValue(event, "expiration");
    return expiration ? parseInt(expiration) : undefined;
  });
}

/** Checks if an event has expired based on the NIP-40 expiration timestamp */
export function isExpired(event: NostrEvent): boolean {
  const expiration = getExpirationTimestamp(event);
  return expiration ? unixNow() > expiration : false;
}
