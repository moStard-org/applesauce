import { EventContentEncryptionMethod, EncryptedContentSymbol } from "applesauce-core/helpers";

import { EventOperation } from "../../event-factory.js";

/** Sets the content to be encrypted to the pubkey with optional override method */
export function setEncryptedContent(pubkey: string, content: string, method?: "nip04" | "nip44"): EventOperation {
  return async (draft, { signer }) => {
    if (!signer) throw new Error("Signer required for encrypted content");

    // Set method based on kind if not provided
    method = method ?? EventContentEncryptionMethod[draft.kind];
    if (!method) throw new Error(`Failed to find encryption method for kind ${draft.kind}`);

    const methods = signer[method];
    if (!methods) throw new Error(`Signer does not support ${method} encryption`);

    // add the plaintext content on the draft so it can be carried forward
    const encrypted = await methods.encrypt(pubkey, content);
    return { ...draft, content: encrypted, [EncryptedContentSymbol]: content };
  };
}

/** Sets the hidden content on an event */
export function setHiddenContent(content: string): EventOperation {
  return async (draft, ctx) => {
    if (!ctx.signer) throw new Error("Signer required for encrypted content");

    const pubkey = await ctx.signer.getPublicKey();
    return setEncryptedContent(pubkey, content)(draft, ctx);
  };
}
