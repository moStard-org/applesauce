import { kinds } from "nostr-tools";
import { ProfilePointer } from "nostr-tools/nip19";
import { map } from "rxjs/operators";

import { getContacts, getHiddenContacts, getPublicContacts } from "../helpers/contacts.js";
import { watchEventUpdates } from "../observable/index.js";
import { Model } from "../event-store/interface.js";

/** A model that returns all contacts for a user */
export function ContactsModel(pubkey: string): Model<ProfilePointer[]> {
  return (events) =>
    events.replaceable(kinds.Contacts, pubkey).pipe(
      // listen for event updates (hidden tags unlocked)
      watchEventUpdates(events),
      // Get all contacts
      map((e) => (e ? getContacts(e) : [])),
    );
}

/** A model that returns all public contacts for a user */
export function PublicContactsModel(pubkey: string): Model<ProfilePointer[] | undefined> {
  return (events) => events.replaceable(kinds.Contacts, pubkey).pipe(map((e) => e && getPublicContacts(e)));
}

/** A model that returns all hidden contacts for a user */
export function HiddenContactsModel(pubkey: string): Model<ProfilePointer[] | null | undefined> {
  return (events) =>
    events.replaceable(kinds.Contacts, pubkey).pipe(
      // listen for event updates (hidden tags unlocked)
      watchEventUpdates(events),
      // Get hidden contacts
      map((e) => e && (getHiddenContacts(e) ?? null)),
    );
}
