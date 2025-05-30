import { kinds, NostrEvent } from "nostr-tools";
import { blueprint } from "../event-factory.js";
import { MetaTagOptions, setMetaTags } from "../operations/event/common.js";
import { includeShareTags, setShareContent, setShareKind } from "../operations/event/share.js";
import { setZapSplit, ZapOptions } from "../operations/event/zap.js";

export type ShareBlueprintOptions = MetaTagOptions & ZapOptions;

/** Blueprint for a NIP-18 repost event */
export function ShareBlueprint(event: NostrEvent, options?: ShareBlueprintOptions) {
  return blueprint(
    kinds.Repost,
    setShareKind(event),
    setShareContent(event),
    includeShareTags(event),
    setMetaTags(options),
    setZapSplit(options),
  );
}
