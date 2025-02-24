import { ZapSplit } from "applesauce-core/helpers";

import { EventOperation } from "../../event-factory.js";
import { fillAndTrimTag } from "../../helpers/tag.js";

/** Override the zap splits on an event */
export function setZapSplit(splits: Omit<ZapSplit, "percent" | "relay">[]): EventOperation {
  return async (draft, ctx) => {
    let tags = Array.from(draft.tags);

    // remove any existing zap split tags
    tags = tags.filter((t) => t[0] !== "zap");

    // add split tags
    for (const split of splits) {
      const hint = await ctx.getPubkeyRelayHint?.(split.pubkey);
      tags.push(fillAndTrimTag(["zap", split.pubkey, hint, String(split.weight)]));
    }

    return { ...draft, tags };
  };
}
