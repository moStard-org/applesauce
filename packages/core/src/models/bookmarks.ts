import { kinds } from "nostr-tools";
import { map } from "rxjs/operators";

import { Bookmarks, getBookmarks, getHiddenBookmarks, getPublicBookmarks } from "../helpers/bookmarks.js";
import { watchEventUpdates } from "../observable/index.js";
import { Model } from "../event-store/interface.js";

/** A model that returns all the bookmarks of a user */
export function UserBookmarkModel(pubkey: string): Model<Bookmarks | undefined> {
  return (events) =>
    events.replaceable(kinds.Mutelist, pubkey).pipe(
      // listen for event updates (hidden tags unlocked)
      watchEventUpdates(events),
      // Get all bookmarks
      map((event) => event && getBookmarks(event)),
    );
}

/** A model that returns all the public bookmarks of a user */
export function UserPublicBookmarkModel(pubkey: string): Model<Bookmarks | undefined> {
  return (events) =>
    events.replaceable(kinds.Mutelist, pubkey).pipe(map((event) => event && getPublicBookmarks(event)));
}

/** A model that returns all the hidden bookmarks of a user */
export function UserHiddenBookmarkModel(pubkey: string): Model<Bookmarks | null | undefined> {
  return (events) =>
    events.replaceable(kinds.Mutelist, pubkey).pipe(
      // listen for event updates (hidden tags unlocked)
      watchEventUpdates(events),
      // Get hidden bookmarks
      map((event) => event && (getHiddenBookmarks(event) ?? null)),
    );
}
