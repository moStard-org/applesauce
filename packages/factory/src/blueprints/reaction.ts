import { Emoji } from "applesauce-core/helpers";
import { kinds, NostrEvent } from "nostr-tools";

import { blueprint } from "../event-factory.js";
import { includeContentEmojiTags } from "../operations/event/emojis.js";
import { includeReactionTags, setReactionContent } from "../operations/event/reaction.js";

/** blueprint for kind 7 reaction event */
export function ReactionBlueprint(event: NostrEvent, emoji: string | Emoji = "+") {
  return blueprint(
    kinds.Reaction,
    setReactionContent(emoji),
    includeReactionTags(event),
    typeof emoji !== "string" ? includeContentEmojiTags([emoji]) : undefined,
  );
}
