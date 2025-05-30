import { kinds } from "nostr-tools";
import { Action } from "../action-hub.js";
import { addPubkeyTag, removePubkeyTag } from "applesauce-factory/operations/tag";

/** An action that adds a pubkey to a users contacts event */
export function FollowUser(pubkey: string, relay?: string, hidden = false): Action {
  return async function* ({ events, factory, self }) {
    const contacts = events.getReplaceable(kinds.Contacts, self);
    if (!contacts) throw new Error("Missing contacts event");

    const pointer = { pubkey, relays: relay ? [relay] : undefined };
    const operation = addPubkeyTag(pointer);
    const draft = await factory.modifyTags(contacts, hidden ? { hidden: operation } : operation);
    yield await factory.sign(draft);
  };
}

/** An action that removes a pubkey from a users contacts event */
export function UnfollowUser(pubkey: string, hidden = false): Action {
  return async function* ({ events, factory, self }) {
    const contacts = events.getReplaceable(kinds.Contacts, self);
    if (!contacts) throw new Error("Missing contacts event");

    const operation = removePubkeyTag(pubkey);
    const draft = await factory.modifyTags(contacts, hidden ? { hidden: operation } : operation);
    yield await factory.sign(draft);
  };
}

/** An action that creates a new kind 3 contacts lists, throws if a contact list already exists */
export function NewContacts(pubkeys?: string[]): Action {
  return async function* ({ events, factory, self }) {
    const contacts = events.getReplaceable(kinds.Contacts, self);
    if (contacts) throw new Error("Contact list already exists");

    const draft = await factory.build({ kind: kinds.Contacts, tags: pubkeys?.map((p) => ["p", p]) });
    yield await factory.sign(draft);
  };
}
