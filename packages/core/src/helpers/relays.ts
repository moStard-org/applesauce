import { NostrEvent } from "nostr-tools";
import { normalizeURL } from "./url.js";

export const SeenRelaysSymbol = Symbol.for("seen-relays");
declare module "nostr-tools" {
  export interface Event {
    [SeenRelaysSymbol]?: Set<string>;
  }
}

/** Marks an event as being seen on a relay */
export function addSeenRelay(event: NostrEvent, relay: string) {
  if (!event[SeenRelaysSymbol]) event[SeenRelaysSymbol] = new Set();

  event[SeenRelaysSymbol].add(relay);

  return event[SeenRelaysSymbol];
}

/** Returns the set of relays this event was seen on */
export function getSeenRelays(event: NostrEvent) {
  return event[SeenRelaysSymbol];
}

const WEBSOCKET_URL_CHECK =
  /^wss?:\/\/([-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}|localhost)\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)$/;

/** A fast check to make sure relay hints are safe to connect to */
export function isSafeRelayURL(relay: string) {
  // anything smaller than 8 is not a URL
  return relay.length >= 8 && WEBSOCKET_URL_CHECK.test(relay);
}

/** Merge multiple sets of relays and remove duplicates (ignores invalid URLs) */
export function mergeRelaySets(...sources: (Iterable<string> | undefined)[]) {
  const set = new Set<string>();

  for (const src of sources) {
    if (!src) continue;
    for (const url of src) {
      try {
        const safe = normalizeURL(url).toString();
        if (safe) set.add(safe);
      } catch (error) {
        // failed to parse URL, ignore
      }
    }
  }

  return Array.from(set);
}
