import { ISyncEventStore } from "applesauce-core/event-store";
import { modifyPublicTags } from "applesauce-factory/operations/event";
import { addRelayTag, removeRelayTag } from "applesauce-factory/operations/tag/relay";
import { kinds } from "nostr-tools";

import { Action } from "../action-hub.js";

function getDMRelaysEvent(events: ISyncEventStore, self: string) {
  const event = events.getReplaceable(kinds.DirectMessageRelaysList, self);
  if (!event) throw new Error("Can't find DM relays event");
  return event;
}

/** An action that adds a relay to the 10050 DM relays event */
export function AddDMRelay(relay: string | string[]): Action {
  return async function* ({ events, factory, self }) {
    const dmRelays = getDMRelaysEvent(events, self);

    const operation = Array.isArray(relay) ? relay.map((r) => addRelayTag(r)) : addRelayTag(relay);
    const draft = await factory.modifyTags(dmRelays, operation);
    yield await factory.sign(draft);
  };
}

/** An action that removes a relay from the 10050 DM relays event */
export function RemoveDMRelay(relay: string | string[]): Action {
  return async function* ({ events, factory, self }) {
    const dmRelays = getDMRelaysEvent(events, self);

    const operation = Array.isArray(relay) ? relay.map((r) => removeRelayTag(r)) : removeRelayTag(relay);
    const draft = await factory.modifyTags(dmRelays, operation);
    yield await factory.sign(draft);
  };
}

/** Creates a new DM relays event */
export function NewDMRelays(relays?: string[]): Action {
  return async function* ({ events, factory, self }) {
    const dmRelays = events.getReplaceable(kinds.DirectMessageRelaysList, self);
    if (dmRelays) throw new Error("DM relays event already exists");

    const operations = relays?.map((r) => addRelayTag(r)) ?? [];
    const draft = await factory.build({ kind: kinds.DirectMessageRelaysList }, modifyPublicTags(...operations));
    yield await factory.sign(draft);
  };
}
