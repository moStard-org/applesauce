import { nanoid } from "nanoid";
import { EventTemplate, NostrEvent, UnsignedEvent } from "nostr-tools";
import { isAddressableKind } from "nostr-tools/kinds";

import { EventOperation } from "../../event-factory.js";
import { ensureSingletonTag } from "../../helpers/tag.js";
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
