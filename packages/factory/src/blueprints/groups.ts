import { GROUP_MESSAGE_KIND, GroupPointer } from "applesauce-core/helpers";
import { NostrEvent } from "nostr-tools";

import { EventFactory } from "../event-factory.js";
import { MetaTagOptions, setMetaTags } from "../operations/event/common.js";
import { setShortTextContent, TextContentOptions } from "../operations/event/content.js";
import { includeGroupHTag, includeGroupPreviousTags } from "../operations/event/groups.js";
import { EventBlueprint } from "../types.js";

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
      setShortTextContent(content, options),
      // Add common meta tags
      setMetaTags(options),
    );
}
