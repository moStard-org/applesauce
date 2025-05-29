import { kinds, NostrEvent } from "nostr-tools";
import { EventFactory } from "../event-factory.js";
import { MetaTagOptions, setMetaTags } from "../operations/event/common.js";
import { includeShareTags, setShareContent, setShareKind } from "../operations/event/share.js";
import { setZapSplit, ZapOptions } from "../operations/event/zap.js";
import { EventBlueprint } from "../types.js";

export type ShareBlueprintOptions = MetaTagOptions & ZapOptions;

/** Blueprint for a NIP-18 repost event */
export function ShareBlueprint(event: NostrEvent, options?: ShareBlueprintOptions): EventBlueprint {
  return (ctx) =>
    EventFactory.runProcess(
      { kind: kinds.Repost },
      ctx,
      setShareKind(event),
      setShareContent(event),
      includeShareTags(event),
      setMetaTags(options),
      setZapSplit(options),
    );
}
