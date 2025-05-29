import { FileMetadata } from "applesauce-core/helpers";
import { kinds } from "nostr-tools";

import { EventFactory } from "../event-factory.js";
import { skip } from "../helpers/pipeline.js";
import { MetaTagOptions, setMetaTags } from "../operations/event/common.js";
import { setShortTextContent, TextContentOptions } from "../operations/event/content.js";
import { includeFileMetadataTags } from "../operations/event/file-metadata.js";
import { includeHashtags } from "../operations/event/hashtags.js";
import { EventBlueprint } from "../types.js";

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
      description ? setShortTextContent(description, options) : skip(),
      options?.hashtags ? includeHashtags(options.hashtags) : skip(),
      setMetaTags(options),
    );
}
