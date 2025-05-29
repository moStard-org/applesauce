import { Emoji } from "applesauce-core/helpers/emoji";
import { Expressions } from "applesauce-content/helpers";

import { EventOperation } from "../../types.js";

/** Adds "emoji" tags for NIP-30 emojis used in the content */
export function includeContentEmojiTags(emojis?: Emoji[]): EventOperation {
  return (draft, ctx) => {
    const all = [...(ctx.emojis ?? []), ...(emojis ?? [])];
    const tags = Array.from(draft.tags);

    // create tags for all occurrences of #hashtag
    const matches = draft.content.matchAll(Expressions.emoji);
    for (const [_, name] of matches) {
      const emoji = all.find((e) => e.shortcode === name);

      if (emoji?.url) {
        tags.push(["emoji", emoji.shortcode, emoji.url]);
      }
    }

    return { ...draft, tags };
  };
}
