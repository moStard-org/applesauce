import { isAddressableKind } from "nostr-tools/kinds";
import { nanoid } from "nanoid";

import { EventOperation } from "../../event-factory.js";
import { ensureSingletonTag } from "../../helpers/tag.js";
import { setProtected } from "./protected.js";
import { setExpirationTimestamp } from "./expiration.js";

/** Ensures parameterized replaceable kinds have "d" tags */
export function includeReplaceableIdentifier(identifier: string | (() => string) = nanoid): EventOperation {
  return (draft) => {
    if (!isAddressableKind(draft.kind)) return draft;

    if (!draft.tags.some((t) => t[0] === "d" && t[1])) {
      let tags = Array.from(draft.tags);
      const id = typeof identifier === "string" ? identifier : identifier();

      tags = ensureSingletonTag(tags, ["d", id], true);
      return { ...draft, tags };
    }

    return draft;
  };
}

/** Options for {@link createMetaTagOperations} */
export type MetaTagOptions = {
  protected?: boolean;
  expiration?: number;
};

/** Creates the necessary operations for meta tag options */
export function createMetaTagOperations(options?: MetaTagOptions): EventOperation[] {
  return [
    options?.protected ? setProtected(true) : undefined,
    options?.expiration ? setExpirationTimestamp(options.expiration) : undefined,
  ].filter((o) => !!o);
}
