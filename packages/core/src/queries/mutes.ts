import { kinds } from "nostr-tools";
import { map } from "rxjs/operators";

import { getHiddenMutedThings, getMutedThings, getPublicMutedThings, Mutes } from "../helpers/mutes.js";
import { watchEventUpdates } from "../observable/watch-event-updates.js";
import { Query } from "../query-store/index.js";

/** A query that returns all a users muted things */
export function MuteQuery(pubkey: string): Query<Mutes | undefined> {
  return (events) =>
    events.replaceable(kinds.Mutelist, pubkey).pipe(
      // listen for event updates (hidden tags unlocked)
      watchEventUpdates(events),
      // Get all muted things
      map((event) => event && getMutedThings(event)),
    );
}

/** A query that returns all a users public muted things */
export function PublicMuteQuery(pubkey: string): Query<Mutes | undefined> {
  return (events) =>
    events.replaceable(kinds.Mutelist, pubkey).pipe(map((event) => event && getPublicMutedThings(event)));
}

/** A query that returns all a users hidden muted things */
export function HiddenMuteQuery(pubkey: string): Query<Mutes | null | undefined> {
  return (events) =>
    events.replaceable(kinds.Mutelist, pubkey).pipe(
      // listen for event updates (hidden tags unlocked)
      watchEventUpdates(events),
      // Get hidden muted things
      map((event) => event && getHiddenMutedThings(event)),
    );
}
