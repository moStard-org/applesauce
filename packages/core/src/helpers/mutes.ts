import { NostrEvent } from "nostr-tools";
import { isETag, isPTag, isTTag } from "./tags.js";
import { getOrComputeCachedValue } from "./cache.js";
import { getHiddenTags } from "./hidden-tags.js";

export const MutePublicSymbol = Symbol.for("mute-public");
export const MuteHiddenSymbol = Symbol.for("mute-hidden");

export type Mutes = {
  pubkeys: Set<string>;
  threads: Set<string>;
  hashtags: Set<string>;
  words: Set<string>;
};

/** Parses mute tags */
export function parseMutedTags(tags: string[][]): Mutes {
  const pubkeys = new Set(tags.filter(isPTag).map((t) => t[1]));
  const threads = new Set(tags.filter(isETag).map((t) => t[1]));
  const hashtags = new Set(tags.filter(isTTag).map((t) => t[1].toLocaleLowerCase()));
  const words = new Set(tags.filter((t) => t[0] === "word" && t[1]).map((t) => t[1].toLocaleLowerCase()));

  return { pubkeys, threads, hashtags, words };
}

/** Returns muted things */
export function getMutedThings(mute: NostrEvent) {
  return getOrComputeCachedValue(mute, MutePublicSymbol, () => parseMutedTags(mute.tags));
}

/** Returns the hidden muted content if the event is unlocked */
export function getHiddenMutedThings(mute: NostrEvent) {
  return getOrComputeCachedValue(mute, MuteHiddenSymbol, () => {
    const tags = getHiddenTags(mute);
    return tags && parseMutedTags(tags);
  });
}
