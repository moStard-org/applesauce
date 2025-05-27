import { kinds, NostrEvent } from "nostr-tools";
import { EventFactory, EventBlueprint } from "../event-factory.js";
import { includeShareTags, setShareContent, setShareKind } from "../operations/event/share.js";
import { createMetaTagOperations, MetaTagOptions } from "../operations/event/common.js";
import { createZapOperations, ZapOptions } from "../operations/event/zap.js";

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
      ...createMetaTagOperations(options),
      ...createZapOperations(options),
    );
}
