import { Token } from "@cashu/cashu-ts";
import { blueprint, EventBlueprint } from "applesauce-factory";
import { skip } from "applesauce-factory/helpers";
import { NostrEvent } from "nostr-tools";
import { ProfilePointer } from "nostr-tools/nip19";

import { NUTZAP_KIND } from "../helpers/zaps.js";
import {
  setNutzapComment,
  setNutzapEvent,
  setNutzapMint,
  setNutzapProofs,
  setNutzapRecipient,
} from "../operations/event/zaps.js";

/** A blueprint to create a NIP-61 nutzap event for an event */
export function NutzapBlueprint(event: NostrEvent, token: Token, comment?: string): EventBlueprint {
  return blueprint(
    NUTZAP_KIND,
    setNutzapProofs(token.proofs),
    setNutzapMint(token.mint),
    setNutzapEvent(event),
    setNutzapRecipient(event.pubkey),
    comment ? setNutzapComment(comment) : skip(),
  );
}

/** A blueprint to create a NIP-61 nutzap event for a user instead of an event */
export function ProfileNutzapBlueprint(user: string | ProfilePointer, token: Token, comment?: string): EventBlueprint {
  return blueprint(
    NUTZAP_KIND,
    setNutzapProofs(token.proofs),
    setNutzapMint(token.mint),
    setNutzapRecipient(user),
    comment ? setNutzapComment(comment) : skip(),
  );
}
