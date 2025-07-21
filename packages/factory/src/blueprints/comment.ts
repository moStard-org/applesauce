import { COMMENT_KIND } from "applesauce-core/helpers";
import { NostrEvent } from "nostr-tools";

import { blueprint } from "../event-factory.js";
import { includeCommentTags } from "../operations/event/comment.js";
import { MetaTagOptions, setMetaTags } from "../operations/event/common.js";
import { setShortTextContent, TextContentOptions } from "../operations/event/content.js";

export type CommentBlueprintOptions = TextContentOptions & MetaTagOptions;

/** A blueprint to create a NIP-22 comment event */
export function CommentBlueprint(parent: NostrEvent, content: string, options?: CommentBlueprintOptions) {
  return blueprint(
    COMMENT_KIND,
    includeCommentTags(parent),
    setShortTextContent(content, options),
    setMetaTags(options),
  );
}
