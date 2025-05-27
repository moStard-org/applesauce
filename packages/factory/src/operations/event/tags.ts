import {
  canHaveHiddenTags,
  getHiddenTags,
  getHiddenTagsEncryptionMethods,
  hasHiddenTags,
  EncryptedContentSymbol,
  unlockHiddenTags,
} from "applesauce-core/helpers";
import { EventOperation, TagOperation } from "../../event-factory.js";
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

/** Creates an operation that modifies the existing array of tags on an event */
export function modifyPublicTags(...operations: (TagOperation | undefined)[]): EventOperation {
  return async (draft, ctx) => {
    if (operations.length === 0) return draft;

    let tags = Array.from(draft.tags);

    // modify the pubic tags
    if (Array.isArray(operations)) {
      for (const operation of operations) if (operation) tags = await operation(tags, ctx);
    }

    return { ...draft, tags };
  };
}

/** Creates an operation that modifies the existing array of tags on an event */
export function modifyHiddenTags(...operations: (TagOperation | undefined)[]): EventOperation {
  return async (draft, ctx) => {
    if (operations.length === 0) return draft;

    let tags = Array.from(draft.tags);

    if (!ctx.signer) throw new Error("Missing signer for hidden tags");
    if (!canHaveHiddenTags(draft.kind)) throw new Error("Event kind does not support hidden tags");

    let hidden: string[][] | undefined = undefined;

    if (hasHiddenTags(draft)) {
      hidden = getHiddenTags(draft);

      if (hidden === undefined) {
        if (hasHiddenTags(draft)) {
          // draft is an existing event, attempt to unlock tags
          const pubkey = await ctx.signer.getPublicKey();
          hidden = await unlockHiddenTags({ ...draft, pubkey }, ctx.signer);
        } else {
          // create a new array of hidden tags
          hidden = [];
        }
      }
    } else {
      // this is a fresh draft, create a new hidden tags
      hidden = [];
    }

    if (hidden === undefined) throw new Error("Failed to find hidden tags");

    let newHidden = Array.from(hidden);
    for (const operation of operations) if (operation) newHidden = await operation(newHidden, ctx);

    const methods = getHiddenTagsEncryptionMethods(draft.kind, ctx.signer);

    const pubkey = await ctx.signer.getPublicKey();
    const plaintext = JSON.stringify(newHidden);
    const content = await methods.encrypt(pubkey, plaintext);

    // add the plaintext content on the draft so it can be carried forward
    return { ...draft, content, tags, [EncryptedContentSymbol]: plaintext };
  };
}
