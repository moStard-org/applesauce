import { Transformer } from "unified";
import { decode } from "nostr-tools/nip19";
import { Root } from "../nast/types.js";

import { Tokens } from "../helpers/regexp.js";
import { findAndReplace } from "../nast/find-and-replace.js";

/** Finds and creates NIP-19 nostr mentions in the tree */
export function nostrMentions(): Transformer<Root> {
  return (tree) => {
    findAndReplace(tree, [
      [
        Tokens.nostrLink,
        (_: string, $1: string) => {
          try {
            return {
              type: "mention",
              decoded: decode($1),
              encoded: $1,
            };
          } catch (error) {}

          return false;
        },
      ],
    ]);
  };
}
