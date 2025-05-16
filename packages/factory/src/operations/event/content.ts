import { Emoji } from "applesauce-core/helpers/emoji";
import { getPubkeyFromDecodeResult, HiddenContentSymbol } from "applesauce-core/helpers";

import { EventOperation } from "../../event-factory.js";
import { includeQuoteTags } from "./quote.js";
import { includeContentHashtags } from "./hashtags.js";
import { includeContentEmojiTags } from "./emojis.js";
import { getContentPointers } from "../../helpers/content.js";
import { ensureProfilePointerTag } from "../../helpers/common-tags.js";

/** Override the event content */
export function setContent(content: string): EventOperation {
  return async (draft) => {
    draft = { ...draft, content };
    Reflect.deleteProperty(draft, HiddenContentSymbol);
    return draft;
  };
}

/** Encrypts the content to a pubkey */
export function setEncryptedContent(pubkey: string, content: string, method: "nip04" | "nip44"): EventOperation {
  return async (draft, { signer }) => {
    if (!signer) throw new Error("Signer required for encrypted content");
    if (!signer[method]) throw new Error(`Signer does not support ${method} encryption`);

    // add the plaintext content on the draft so it can be carried forward
    return { ...draft, content: await signer[method].encrypt(pubkey, content), [HiddenContentSymbol]: content };
  };
}

/** Replaces any `@npub` or bare npub mentions with nostr: prefix */
export function repairContentNostrLinks(): EventOperation {
  return (draft) => ({
    ...draft,
    content: draft.content.replaceAll(
      /(?<=^|\s)(?:@)?((?:npub|note|nprofile|nevent|naddr)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58})/gi,
      "nostr:$1",
    ),
  });
}

/** "p" tag any pubkey mentioned in the content using nostr: links */
export function tagPubkeyMentionedInContent(): EventOperation {
  return (draft) => {
    let tags = Array.from(draft.tags);
    const mentions = getContentPointers(draft.content);

    for (const mention of mentions) {
      const pubkey = getPubkeyFromDecodeResult(mention);
      if (pubkey) tags = ensureProfilePointerTag(tags, mention.type === "nprofile" ? mention.data : { pubkey });
    }

    return { ...draft, tags };
  };
}

/** Sets the NIP-36 content-warning tag */
export function setContentWarning(warning: boolean | string): EventOperation {
  return (draft) => {
    let tags = Array.from(draft.tags);

    // remove existing content warning
    tags = tags.filter((t) => t[0] !== "content-warning");

    if (typeof warning === "string") tags.push(["content-warning", warning]);
    else if (warning === true) tags.push(["content-warning"]);

    return { ...draft, tags };
  };
}

export type TextContentOptions = {
  emojis?: Emoji[];
  contentWarning?: boolean | string;
};

/** Create a set of operations for common text content */
export function createTextContentOperations(content: string, options?: TextContentOptions): EventOperation[] {
  return [
    // set text content
    setContent(content),
    // fix @ mentions
    repairContentNostrLinks(),
    // include "p" tags for pubkeys mentioned
    tagPubkeyMentionedInContent(),
    // include event "q" tags
    includeQuoteTags(),
    // include "t" tags for hashtags
    includeContentHashtags(),
    // include "emoji" tags
    options?.emojis && includeContentEmojiTags(options.emojis),
    // set "content-warning" tag
    options?.contentWarning !== undefined ? setContentWarning(options.contentWarning) : undefined,
  ].filter((o) => !!o);
}
