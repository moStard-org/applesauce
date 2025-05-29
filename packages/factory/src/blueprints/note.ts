import { kinds } from "nostr-tools";

import { EventFactory } from "../event-factory.js";
import { MetaTagOptions, setMetaTags } from "../operations/event/common.js";
import { setShortTextContent, TextContentOptions } from "../operations/event/content.js";
import { setZapSplit, ZapOptions } from "../operations/event/zap.js";
import { EventBlueprint } from "../types.js";

export type NoteBlueprintOptions = TextContentOptions & MetaTagOptions & ZapOptions;

/** Short text note (kind 1) blueprint */
export function NoteBlueprint(content: string, options?: NoteBlueprintOptions): EventBlueprint {
  return (ctx) =>
    EventFactory.runProcess(
      { kind: kinds.ShortTextNote },
      ctx,
      setShortTextContent(content, options),
      setZapSplit(options),
      setMetaTags(options),
    );
}
