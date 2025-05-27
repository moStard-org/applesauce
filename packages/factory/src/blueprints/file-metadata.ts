import { kinds } from "nostr-tools";
import { FileMetadata } from "applesauce-core/helpers";

import { createTextContentOperations, TextContentOptions } from "../operations/event/content.js";
import { EventFactory, EventBlueprint } from "../event-factory.js";
import { includeFileMetadataTags } from "../operations/event/file-metadata.js";
import { includeHashtags } from "../operations/event/hashtags.js";
import { createMetaTagOperations, MetaTagOptions } from "../operations/event/common.js";

export type FileMetadataBlueprintOptions = TextContentOptions & MetaTagOptions & { hashtags?: string[] };

/** Blueprint to create a NIP-94 file metadata event */
export function FileMetadataBlueprint(
  metadata: FileMetadata,
  description?: string,
  options?: FileMetadataBlueprintOptions,
): EventBlueprint {
  return (ctx) =>
    EventFactory.runProcess(
      { kind: kinds.FileMetadata },
      ctx,
      includeFileMetadataTags(metadata),
      ...(description ? createTextContentOperations(description, options) : []),
      options?.hashtags ? includeHashtags(options.hashtags) : undefined,
      ...createMetaTagOperations(options),
    );
}
