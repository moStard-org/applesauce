import { kinds } from "nostr-tools";
import { ProfilePointer } from "nostr-tools/nip19";
import { map } from "rxjs/operators";

import { getContacts, getHiddenContacts, getPublicContacts } from "../helpers/contacts.js";
import { watchEventUpdates } from "../observable/index.js";
import { Query } from "../query-store/index.js";

/** A query that returns all contacts for a user */
export function ContactsQuery(pubkey: string): Query<ProfilePointer[] | undefined> {
  return (events) =>
    events.replaceable(kinds.Contacts, pubkey).pipe(
      // listen for event updates (hidden tags unlocked)
      watchEventUpdates(events),
      // Get all contacts
      map((e) => e && getContacts(e)),
    );
}

/** A query that returns all public contacts for a user */
export function PublicContactsQuery(pubkey: string): Query<ProfilePointer[] | undefined> {
  return (events) => events.replaceable(kinds.Contacts, pubkey).pipe(map((e) => e && getPublicContacts(e)));
}

/** A query that returns all hidden contacts for a user */
export function HiddenContactsQuery(pubkey: string): Query<ProfilePointer[] | null | undefined> {
  return (events) =>
    events.replaceable(kinds.Contacts, pubkey).pipe(
      // listen for event updates (hidden tags unlocked)
      watchEventUpdates(events),
      // Get hidden contacts
      map((e) => e && (getHiddenContacts(e) ?? null)),
    );
}
