import { kinds, NostrEvent } from "nostr-tools";
import { AddressPointer, EventPointer } from "nostr-tools/nip19";

import { getOrComputeCachedValue } from "./cache.js";
import { getHiddenTags, isHiddenTagsLocked } from "./index.js";
import { mergeAddressPointers, mergeEventPointers } from "./nip-19.js";
import { getAddressPointerFromATag, getCoordinateFromAddressPointer, getEventPointerFromETag } from "./pointers.js";

export const BookmarkPublicSymbol = Symbol.for("bookmark-public");
export const BookmarkHiddenSymbol = Symbol.for("bookmark-hidden");

export type Bookmarks = {
  notes: EventPointer[];
  articles: AddressPointer[];
  hashtags: string[];
  urls: string[];
};

/** Parses an array of tags into a {@link Bookmarks} object */
export function parseBookmarkTags(tags: string[][]): Bookmarks {
  const notes = tags.filter((t) => t[0] === "e" && t[1]).map(getEventPointerFromETag);
  const articles = tags
    .filter((t) => t[0] === "a" && t[1])
    .map(getAddressPointerFromATag)
    .filter((addr) => addr.kind === kinds.LongFormArticle);
  const hashtags = tags.filter((t) => t[0] === "t" && t[1]).map((t) => t[1]);
  const urls = tags.filter((t) => t[0] === "r" && t[1]).map((t) => t[1]);

  return { notes, articles, hashtags, urls };
}

/** Merges any number of {@link Bookmarks} objects */
export function mergeBookmarks(...bookmarks: (Bookmarks | undefined)[]): Bookmarks {
  const notes: Map<string, EventPointer> = new Map();
  const articles = new Map<string, AddressPointer>();
  const hashtags: Set<string> = new Set();
  const urls: Set<string> = new Set();

  for (const bookmark of bookmarks) {
    if (!bookmark) continue;

    for (const note of bookmark.notes) {
      const existing = notes.get(note.id);
      if (existing) notes.set(note.id, mergeEventPointers(existing, note));
      else notes.set(note.id, note);
    }
    for (const article of bookmark.articles) {
      const coord = getCoordinateFromAddressPointer(article);
      const existing = articles.get(coord);
      if (existing) articles.set(coord, mergeAddressPointers(existing, article));
      else articles.set(coord, article);
    }
    for (const hashtag of bookmark.hashtags) hashtags.add(hashtag);
    for (const url of bookmark.urls) urls.add(url);
  }
  return {
    notes: Array.from(notes.values()),
    articles: Array.from(articles.values()),
    hashtags: Array.from(hashtags),
    urls: Array.from(urls),
  };
}

/** Returns all the bookmarks of the event */
export function getBookmarks(bookmark: NostrEvent) {
  const hidden = getHiddenBookmarks(bookmark);
  if (hidden) return mergeBookmarks(hidden, getPublicBookmarks(bookmark));
  else return getPublicBookmarks(bookmark);
}

/** Returns the public bookmarks of the event */
export function getPublicBookmarks(bookmark: NostrEvent) {
  return getOrComputeCachedValue(bookmark, BookmarkPublicSymbol, () => parseBookmarkTags(bookmark.tags));
}

/** Returns the bookmarks of the event if its unlocked */
export function getHiddenBookmarks(bookmark: NostrEvent) {
  if (isHiddenTagsLocked(bookmark)) return undefined;

  return getOrComputeCachedValue(bookmark, BookmarkHiddenSymbol, () => parseBookmarkTags(getHiddenTags(bookmark)!));
}
