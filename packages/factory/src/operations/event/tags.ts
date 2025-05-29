import {
  canHaveHiddenTags,
  EncryptedContentSymbol,
  getHiddenTags,
  getHiddenTagsEncryptionMethods,
  hasHiddenTags,
  unlockHiddenTags,
} from "applesauce-core/helpers";
import { EventTemplate, NostrEvent, UnsignedEvent } from "nostr-tools";
import { skip, tagPipeline } from "../../helpers/pipeline.js";
import { EventOperation, TagOperation } from "../../types.js";
import { addNameValueTag, setSingletonTag } from "../tag/common.js";

/** Includes only a single instance of tag in an events public tags */
export function includeSingletonTag(tag: [string, ...string[]], replace = true): EventOperation {
  return modifyPublicTags(setSingletonTag(tag, replace));
}

/** Includes only a single name / value tag in an events public tags */
export function includeNameValueTag(tag: [string, string, ...string[]], replace = true): EventOperation {
  return modifyPublicTags(addNameValueTag(tag, replace));
}

/** Includes a NIP-31 alt tag in an events public tags */
export function includeAltTag(description: string): EventOperation {
  return includeSingletonTag(["alt", description]);
}

/** An event operation that modifies the public tags with tag operations */
export function modifyPublicTags<E extends EventTemplate | UnsignedEvent | NostrEvent>(
  ...operations: (TagOperation | undefined)[]
): EventOperation<E, E> {
  return async (draft, ctx) => {
    return { ...draft, tags: await tagPipeline(...operations)(Array.from(draft.tags), ctx) };
  };
}

/**
 * Creates an event operation that modifies the hidden tags on an event
 * @throws {Error} if no signer is provided
 * @throws {Error} if the event kind does not support hidden tags
 */
export function modifyHiddenTags<E extends EventTemplate | UnsignedEvent | NostrEvent>(
  ...operations: (TagOperation | undefined)[]
): EventOperation<E, E> {
  operations = operations.filter((o) => !!o);
  if (operations.length === 0) return skip();

  return async (draft, ctx) => {
    if (!ctx.signer) throw new Error("Missing signer for hidden tags");
    if (!canHaveHiddenTags(draft.kind)) throw new Error("Event kind does not support hidden tags");

    // Create var to store pubkey
    let pubkey: string | undefined = undefined;

    // Read hidden tags from event or create a new array
    let hidden: string[][] | undefined = undefined;
    if (hasHiddenTags(draft)) {
      // Attempt to read hidden tags from the event
      hidden = getHiddenTags(draft);

      // If that failed, attempt to unlock the tags
      if (hidden === undefined) {
        if (hasHiddenTags(draft)) {
          // draft is an existing event, attempt to unlock tags
          pubkey = await ctx.signer.getPublicKey();
          hidden = await unlockHiddenTags({ ...draft, pubkey }, ctx.signer);
        }
        // create a new array of hidden tags
        else hidden = [];
      }
    }
    // this is a fresh draft, create a new hidden tags
    else hidden = [];

    // Make sure hidden tags where found
    if (hidden === undefined) throw new Error("Failed to find hidden tags");

    // Create the new hidden tags
    const tags = await tagPipeline(...operations)(hidden, ctx);

    // Encrypt new hidden tags
    const methods = getHiddenTagsEncryptionMethods(draft.kind, ctx.signer);
    if (!pubkey) pubkey = await ctx.signer.getPublicKey();
    const plaintext = JSON.stringify(tags);
    const content = await methods.encrypt(pubkey, plaintext);

    // add the plaintext content on the draft so it can be carried forward
    return { ...draft, content, [EncryptedContentSymbol]: plaintext };
  };
}
