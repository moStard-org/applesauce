import { GROUP_MESSAGE_KIND, GroupPointer } from "applesauce-core/helpers";
import { NostrEvent } from "nostr-tools";

import { createTextContentOperations, TextContentOptions } from "../operations/event/content.js";
import { EventFactory, EventBlueprint } from "../event-factory.js";
import { includeGroupHTag, includeGroupPreviousTags } from "../operations/event/groups.js";
import { createMetaTagOperations, MetaTagOptions } from "../operations/event/common.js";

export type GroupMessageBlueprintOptions = { previous: NostrEvent[] } & TextContentOptions & MetaTagOptions;

/** A blueprint for a NIP-29 group message */
export function GroupMessageBlueprint(
  group: GroupPointer,
  content: string,
  options?: GroupMessageBlueprintOptions,
): EventBlueprint {
  return (ctx) =>
    EventFactory.runProcess(
      { kind: GROUP_MESSAGE_KIND },
      ctx,
      // include group id "h" tag
      includeGroupHTag(group),
      // include "previous" events tags
      options?.previous && includeGroupPreviousTags(options.previous),
      // Set text content
      ...createTextContentOperations(content, options),
      // Add common meta tags
      ...createMetaTagOperations(options),
    );
}
