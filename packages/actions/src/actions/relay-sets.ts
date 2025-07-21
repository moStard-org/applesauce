import { IEventStoreRead } from "applesauce-core/event-store";
import {
  modifyHiddenTags,
  modifyPublicTags,
  setListDescription,
  setListImage,
  setListTitle,
} from "applesauce-factory/operations/event";
import { addRelayTag, removeRelayTag } from "applesauce-factory/operations/tag";
import { kinds, NostrEvent } from "nostr-tools";

import { Action } from "../action-hub.js";

function getRelaySetEvent(events: IEventStoreRead, self: string, identifier: NostrEvent | string) {
  const set = typeof identifier === "string" ? events.getReplaceable(kinds.Relaysets, self, identifier) : identifier;
  if (!set) throw new Error("Can't find relay set");
  if (set.kind !== kinds.Relaysets) throw new Error("Event is not a relay set");
  return set;
}

/** An action that adds a relay to a relay set*/
export function AddRelayToRelaySet(relay: string | string[], identifier: NostrEvent | string, hidden = false): Action {
  return async function* ({ events, factory, self }) {
    const relays = getRelaySetEvent(events, self, identifier);

    const operations = Array.isArray(relay) ? relay.map((r) => addRelayTag(r)) : addRelayTag(relay);

    const draft = await factory.modifyTags(relays, hidden ? { hidden: operations } : operations);
    yield await factory.sign(draft);
  };
}

/** An action that removes a relay from a relay set */
export function RemoveRelayFromRelaySet(
  relay: string | string[],
  identifier: NostrEvent | string,
  hidden = false,
): Action {
  return async function* ({ events, factory, self }) {
    const relays = getRelaySetEvent(events, self, identifier);

    const operations = Array.isArray(relay) ? relay.map((r) => removeRelayTag(r)) : removeRelayTag(relay);

    const draft = await factory.modifyTags(relays, hidden ? { hidden: operations } : operations);
    yield await factory.sign(draft);
  };
}

/** An action that creates a new relay set */
export function CreateRelaySet(
  title: string,
  options?: {
    description?: string;
    image?: string;
    public?: string[]; // relay URLs
    hidden?: string[]; // relay URLs
  },
): Action {
  return async function* ({ factory }) {
    const draft = await factory.build(
      { kind: kinds.Relaysets },

      setListTitle(title),
      options?.description ? setListDescription(options.description) : undefined,
      options?.image ? setListImage(options.image) : undefined,

      options?.public ? modifyPublicTags(...options.public.map((r) => addRelayTag(r))) : undefined,
      options?.hidden ? modifyHiddenTags(...options.hidden.map((r) => addRelayTag(r))) : undefined,
    );

    yield await factory.sign(draft);
  };
}

/** An action that updates the title, description, or image of a relay set */
export function UpdateRelaySetInformation(
  identifier: string,
  info: {
    title?: string;
    description?: string;
    image?: string;
  },
): Action {
  return async function* ({ events, factory, self }) {
    const relays = getRelaySetEvent(events, self, identifier);

    const draft = await factory.modify(
      relays,

      info?.title ? setListTitle(info.title) : undefined,
      info?.description ? setListDescription(info.description) : undefined,
      info?.image ? setListImage(info.image) : undefined,
    );

    yield await factory.sign(draft);
  };
}
