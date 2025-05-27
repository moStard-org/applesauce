import { NostrEvent } from "nostr-tools";
import { COMMENT_KIND } from "applesauce-core/helpers";

import { EventFactory, EventBlueprint } from "../event-factory.js";
import { createTextContentOperations, TextContentOptions } from "../operations/event/content.js";
import { includeCommentTags } from "../operations/event/comment.js";
import { createMetaTagOperations, MetaTagOptions } from "../operations/event/common.js";

export type CommentBlueprintOptions = TextContentOptions & MetaTagOptions;

/** A blueprint to create a NIP-22 comment event */
export function CommentBlueprint(
  parent: NostrEvent,
  content: string,
  options?: CommentBlueprintOptions,
): EventBlueprint {
  return (ctx) =>
    EventFactory.runProcess(
      { kind: COMMENT_KIND },
      ctx,
      includeCommentTags(parent),
      ...createTextContentOperations(content, options),
      ...createMetaTagOperations(options),
    );
}
