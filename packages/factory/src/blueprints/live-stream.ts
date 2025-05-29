import { kinds, NostrEvent } from "nostr-tools";
import { EventFactory } from "../event-factory.js";
import { MetaTagOptions, setMetaTags } from "../operations/event/common.js";
import { setShortTextContent, TextContentOptions } from "../operations/event/content.js";
import { includeLiveStreamTag } from "../operations/event/live-stream.js";
import { EventBlueprint } from "../types.js";

export type LiveChatMessageBlueprintOptions = TextContentOptions & MetaTagOptions;

/** A blueprint for creating a live stream message */
export function LiveChatMessageBlueprint(
  stream: NostrEvent,
  message: string,
  options?: LiveChatMessageBlueprintOptions,
): EventBlueprint {
  return (ctx) =>
    EventFactory.runProcess(
      { kind: kinds.LiveChatMessage },
      ctx,
      includeLiveStreamTag(stream),
      setShortTextContent(message, options),
      setMetaTags(options),
    );
}
