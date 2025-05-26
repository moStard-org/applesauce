import { EventTemplate, NostrEvent } from "nostr-tools";

import { Root } from "../nast/types.js";

/** Creates a {@link Root} ATS node for a text note */
export function createEventContentTree(event: NostrEvent | EventTemplate | string, content?: string): Root {
  return {
    type: "root",
    event: typeof event !== "string" ? event : undefined,
    children: [
      {
        type: "text",
        value: content || (typeof event === "string" ? event : event.content),
      },
    ],
  };
}

/** @deprecated use createEventContentTree instead */
export const createTextNoteATS = createEventContentTree;
