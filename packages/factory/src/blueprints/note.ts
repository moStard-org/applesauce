import { kinds } from "nostr-tools";

import { EventBlueprint, EventFactory } from "../event-factory.js";
import { createMetaTagOperations, MetaTagOptions } from "../operations/event/common.js";
import { createTextContentOperations, TextContentOptions } from "../operations/event/content.js";
import { createZapOperations, ZapOptions } from "../operations/event/zap.js";

export type NoteBlueprintOptions = TextContentOptions & MetaTagOptions & ZapOptions;

/** Short text note (kind 1) blueprint */
export function NoteBlueprint(content: string, options?: NoteBlueprintOptions): EventBlueprint {
  return (ctx) =>
    EventFactory.runProcess(
      { kind: kinds.ShortTextNote },
      ctx,
      ...createTextContentOperations(content, options),
      ...createZapOperations(options),
      ...createMetaTagOperations(options),
    );
}
