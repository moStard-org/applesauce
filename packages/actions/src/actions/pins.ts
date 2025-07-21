import { kinds, NostrEvent } from "nostr-tools";
import { addEventTag, removeEventTag } from "applesauce-factory/operations/tag";
import { modifyPublicTags } from "applesauce-factory/operations/event";

import { Action } from "../action-hub.js";

/** An action that pins a note to the users pin list */
export function PinNote(note: NostrEvent): Action {
  return async function* ({ events, factory, self }) {
    const pins = events.getReplaceable(kinds.Pinlist, self);
    if (!pins) throw new Error("Missing pin list");

    const draft = await factory.modifyTags(pins, addEventTag(note.id));
    yield await factory.sign(draft);
  };
}

/** An action that removes an event from the users pin list */
export function UnpinNote(note: NostrEvent): Action {
  return async function* ({ events, factory, self }) {
    const pins = events.getReplaceable(kinds.Pinlist, self);
    if (!pins) throw new Error("Missing pin list");

    const draft = await factory.modifyTags(pins, removeEventTag(note.id));
    yield await factory.sign(draft);
  };
}

/** An action that creates a new pin list for a user */
export function CreatePinList(pins: NostrEvent[] = []): Action {
  return async function* ({ events, factory, self }) {
    const existing = events.getReplaceable(kinds.Pinlist, self);
    if (existing) throw new Error("Pin list already exists");

    const draft = await factory.build(
      { kind: kinds.Pinlist },
      modifyPublicTags(...pins.map((event) => addEventTag(event.id))),
    );
    yield await factory.sign(draft);
  };
}
