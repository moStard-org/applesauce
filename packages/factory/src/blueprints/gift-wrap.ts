import { EventTemplate, NostrEvent, UnsignedEvent } from "nostr-tools";
import { build } from "../event-factory.js";
import { giftWrap } from "../operations/event/gift-wrap.js";
import { EventBlueprint } from "../types.js";

/** Creates a gift wrapped event based on a blueprint */
export function GiftWrapBlueprint(
  pubkey: string,
  blueprint: EventBlueprint | EventTemplate | UnsignedEvent | NostrEvent,
): EventBlueprint<NostrEvent> {
  return async (ctx) =>
    (await build(
      typeof blueprint === "function" ? await blueprint(ctx) : blueprint,
      ctx,
      giftWrap(pubkey),
    )) as NostrEvent;
}
