import { kinds, NostrEvent } from "nostr-tools";
import { build } from "../event-factory.js";
import { setGiftWrapAddress, setGiftWrapSeal, setSealRumor } from "../operations/event/gift-wrap.js";
import { EventBlueprint } from "../types.js";

/** Creates a gift wrapped event based on a blueprint */
export function GiftWrapBlueprint(pubkey: string, blueprint: EventBlueprint): EventBlueprint<NostrEvent> {
  return async (ctx) => {
    if (!ctx.signer) throw new Error("A signer is required to create a gift wrap event");

    // 1. Create unsigned and unstamped rumor
    const rumor = await blueprint(ctx);

    // 2. Create unsigned seal
    const seal = await build(
      { kind: kinds.Seal },
      ctx,
      // Set rumor as content and stamp with sender key
      setSealRumor(pubkey, rumor),
    );

    // 3. Create gift wrap with "p" of recipient
    return (await build(
      { kind: kinds.GiftWrap },
      ctx,
      // Set seal as content and sign with sender key
      setGiftWrapSeal(pubkey, seal),
      setGiftWrapAddress(pubkey),
    )) as unknown as Promise<NostrEvent>;
  };
}
