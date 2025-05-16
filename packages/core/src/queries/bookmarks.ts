import { kinds } from "nostr-tools";
import { map } from "rxjs/operators";

import { Bookmarks, getBookmarks, getHiddenBookmarks, getPublicBookmarks } from "../helpers/bookmarks.js";
import { Query } from "../query-store/index.js";
import { watchEventUpdates } from "../observable/index.js";

/** A query that returns all the bookmarks of a user */
export function UserBookmarkQuery(pubkey: string): Query<Bookmarks | undefined> {
  return (events) =>
    events.replaceable(kinds.Mutelist, pubkey).pipe(
      // listen for event updates (hidden tags unlocked)
      watchEventUpdates(events),
      // Get all bookmarks
      map((event) => event && getBookmarks(event)),
    );
}

/** A query that returns all the public bookmarks of a user */
export function UserPublicBookmarkQuery(pubkey: string): Query<Bookmarks | undefined> {
  return (events) =>
    events.replaceable(kinds.Mutelist, pubkey).pipe(map((event) => event && getPublicBookmarks(event)));
}

/** A query that returns all the hidden bookmarks of a user */
export function UserHiddenBookmarkQuery(pubkey: string): Query<Bookmarks | null | undefined> {
  return (events) =>
    events.replaceable(kinds.Mutelist, pubkey).pipe(
      // listen for event updates (hidden tags unlocked)
      watchEventUpdates(events),
      // Get hidden bookmarks
      map((event) => event && (getHiddenBookmarks(event) ?? null)),
    );
}
