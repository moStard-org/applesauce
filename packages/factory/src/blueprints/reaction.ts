import { Emoji } from "applesauce-core/helpers";
import { kinds, NostrEvent } from "nostr-tools";

import { EventFactory } from "../event-factory.js";
import { includeReactionTags, setReactionContent } from "../operations/event/reaction.js";
import { includeContentEmojiTags } from "../operations/event/emojis.js";
import { EventBlueprint } from "../types.js";

/** blueprint for kind 7 reaction event */
export function ReactionBlueprint(event: NostrEvent, emoji: string | Emoji = "+"): EventBlueprint {
  return (ctx) =>
    EventFactory.runProcess(
      { kind: kinds.Reaction },
      ctx,
      setReactionContent(emoji),
      includeReactionTags(event),
      typeof emoji !== "string" ? includeContentEmojiTags([emoji]) : undefined,
    );
}
