import { IEventStoreRead } from "applesauce-core/event-store";
import { isAddressPointer } from "applesauce-core/helpers";
import { setListDescription, setListImage, setListTitle } from "applesauce-factory/operations/event";
import { NostrEvent } from "nostr-tools";
import { AddressPointer } from "nostr-tools/nip19";

import { Action } from "../action-hub.js";

function getList(events: IEventStoreRead, address: NostrEvent | AddressPointer) {
  const list = isAddressPointer(address)
    ? events.getReplaceable(address.kind, address.pubkey, address.identifier)
    : address;
  if (!list) throw new Error("Can't find list");
  return list;
}

/** An action that sets or removes a NIP-15 list information */
export function SetListMetadata(
  list: NostrEvent | AddressPointer,
  info: {
    title?: string;
    description?: string;
    image?: string;
  },
): Action {
  return async function* ({ events, factory }) {
    list = getList(events, list);

    const draft = await factory.modify(
      list,
      setListTitle(info.title ?? null),
      setListDescription(info.description ?? null),
      setListImage(info.image ?? null),
    );

    yield await factory.sign(draft);
  };
}
