import { kinds } from "nostr-tools";

import { blueprint } from "../event-factory.js";
import { MetaTagOptions, setMetaTags } from "../operations/event/common.js";
import { setShortTextContent, TextContentOptions } from "../operations/event/content.js";
import { setZapSplit, ZapOptions } from "../operations/event/zap.js";

export type NoteBlueprintOptions = TextContentOptions & MetaTagOptions & ZapOptions;

/** Short text note (kind 1) blueprint */
export function NoteBlueprint(content: string, options?: NoteBlueprintOptions) {
  return blueprint(
    kinds.ShortTextNote,
    setShortTextContent(content, options),
    setZapSplit(options),
    setMetaTags(options),
  );
}
