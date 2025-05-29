import { kinds, NostrEvent } from "nostr-tools";

import { EventFactory } from "../event-factory.js";
import { includeChannelPointerTag } from "../operations/event/channels.js";
import { setShortTextContent, TextContentOptions } from "../operations/event/content.js";
import { includeNoteThreadingNotifyTags, includeNoteThreadingTags } from "../operations/event/note.js";
import { EventBlueprint } from "../types.js";

/** Creates a NIP-28 channel message */
export function ChannelMessageBlueprint(
  channel: NostrEvent,
  message: string,
  options?: TextContentOptions,
): EventBlueprint {
  return (ctx) =>
    EventFactory.runProcess(
      { kind: kinds.ChannelMessage },
      ctx,
      includeChannelPointerTag(channel),
      setShortTextContent(message, options),
    );
}

/** Creates a NIP-28 channel message reply */
export function ChannelMessageReplyBlueprint(
  parent: NostrEvent,
  message: string,
  options?: TextContentOptions,
): EventBlueprint {
  return (ctx) =>
    EventFactory.runProcess(
      { kind: kinds.ChannelMessage },
      ctx,
      includeNoteThreadingTags(parent),
      includeNoteThreadingNotifyTags(parent),
      setShortTextContent(message, options),
    );
}
