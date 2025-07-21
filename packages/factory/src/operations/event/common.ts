import { getTagValue, unixNow } from "applesauce-core/helpers";
import { nanoid } from "nanoid";
import { EventTemplate, NostrEvent, UnsignedEvent } from "nostr-tools";
import { isAddressableKind } from "nostr-tools/kinds";

import { eventPipe, skip } from "../../helpers/pipeline.js";
import { ensureSingletonTag } from "../../helpers/tag.js";
import { EventOperation } from "../../types.js";
import { setExpirationTimestamp } from "./expiration.js";
import { setProtected } from "./protected.js";

/** An operation that removes the signature from the event template */
export function stripSignature<Input extends NostrEvent | UnsignedEvent | EventTemplate>(): EventOperation<
  Input,
  Omit<Input, "sig">
> {
  return (draft) => {
    const newDraft = { ...draft };
    Reflect.deleteProperty(newDraft, "sig");
    return newDraft;
  };
}

/** An operation that removes the id and pubkey from the event template */
export function stripStamp<Input extends NostrEvent | UnsignedEvent | EventTemplate>(): EventOperation<
  Input,
  Omit<Input, "id" | "pubkey">
> {
  return (draft) => {
    const newDraft = { ...draft };
    Reflect.deleteProperty(newDraft, "id");
    Reflect.deleteProperty(newDraft, "pubkey");
    return newDraft;
  };
}

/** An operation that updates the created_at timestamp */
export function updateCreatedAt(): EventOperation {
  return (draft) => ({ ...draft, created_at: unixNow() });
}

/** An operation that removes all symbols from the event */
export function stripSymbols(preserve?: symbol[]): EventOperation {
  return (draft) => {
    const newDraft = { ...draft };
    for (const symbol of Reflect.ownKeys(newDraft)) {
      if (typeof symbol !== "string" && !preserve?.includes(symbol)) Reflect.deleteProperty(newDraft, symbol);
    }
    return newDraft;
  };
}

/** Ensures parameterized replaceable kinds have "d" tags */
export function includeReplaceableIdentifier(identifier: string | (() => string) = nanoid): EventOperation {
  return (draft) => {
    if (!isAddressableKind(draft.kind)) return draft;

    // Add a "d" tag if it doesn't exist
    if (!getTagValue(draft, "d")) {
      let tags = Array.from(draft.tags);
      const id = typeof identifier === "string" ? identifier : identifier();

      tags = ensureSingletonTag(tags, ["d", id], true);
      return { ...draft, tags };
    }

    return draft;
  };
}

/** Options for {@link setMetaTags} */
export type MetaTagOptions = {
  protected?: boolean;
  expiration?: number;
};

/** Creates the necessary operations for meta tag options */
export function setMetaTags(options?: MetaTagOptions): EventOperation {
  return eventPipe(
    options?.protected ? setProtected(true) : skip(),
    options?.expiration ? setExpirationTimestamp(options.expiration) : skip(),
  );
}
