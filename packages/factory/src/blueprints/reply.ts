import { kinds, NostrEvent } from "nostr-tools";

import { createTextContentOperations, TextContentOptions } from "../operations/event/content.js";
import { EventFactory, EventBlueprint } from "../event-factory.js";
import { includeNoteThreadingTags, includeNoteThreadingNotifyTags } from "../operations/event/note.js";

/** Short text note reply (kind 1) blueprint */
export function NoteReplyBlueprint(parent: NostrEvent, content: string, options?: TextContentOptions): EventBlueprint {
  if (parent.kind !== kinds.ShortTextNote)
    throw new Error("Kind 1 replies should only be used to reply to kind 1 notes");

  return (ctx) =>
    EventFactory.runProcess(
      { kind: 1 },
      ctx,
      // add NIP-10 tags
      includeNoteThreadingTags(parent),
      // copy "p" tags from parent
      includeNoteThreadingNotifyTags(parent),
      // set default text content
      ...createTextContentOperations(content, options),
    );
}
