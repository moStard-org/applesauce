import { kinds, NostrEvent } from "nostr-tools";

import { blueprint } from "../event-factory.js";
import { includeChannelPointerTag } from "../operations/event/channels.js";
import { setShortTextContent, TextContentOptions } from "../operations/event/content.js";
import { includeNoteThreadingNotifyTags, includeNoteThreadingTags } from "../operations/event/note.js";

/** Creates a NIP-28 channel message */
export function ChannelMessageBlueprint(channel: NostrEvent, message: string, options?: TextContentOptions) {
  return blueprint(kinds.ChannelMessage, includeChannelPointerTag(channel), setShortTextContent(message, options));
}

/** Creates a NIP-28 channel message reply */
export function ChannelMessageReplyBlueprint(parent: NostrEvent, message: string, options?: TextContentOptions) {
  return blueprint(
    kinds.ChannelMessage,
    includeNoteThreadingTags(parent),
    includeNoteThreadingNotifyTags(parent),
    setShortTextContent(message, options),
  );
}
