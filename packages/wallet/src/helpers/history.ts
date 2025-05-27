import {
  getHiddenTags,
  getOrComputeCachedValue,
  HiddenContentSigner,
  isETag,
  isHiddenContentLocked,
  isHiddenTagsLocked,
  lockHiddenTags,
  setHiddenTagsEncryptionMethod,
  unlockHiddenTags,
} from "applesauce-core/helpers";
import { NostrEvent } from "nostr-tools";

export const WALLET_HISTORY_KIND = 7376;

// Enable hidden content for wallet history kind
setHiddenTagsEncryptionMethod(WALLET_HISTORY_KIND, "nip44");

export type HistoryDirection = "in" | "out";

export type HistoryContent = {
  /** The direction of the transaction, in = received, out = sent */
  direction: HistoryDirection;
  /** The amount of the transaction */
  amount: number;
  /** An array of token event ids created */
  created: string[];
  /** The mint that was spent from */
  mint?: string;
  /** The fee paid */
  fee?: number;
};

export const HistoryContentSymbol = Symbol.for("history-content");

/** returns an array of redeemed event ids in a history event */
export function getHistoryRedeemed(history: NostrEvent): string[] {
  return history.tags.filter((t) => isETag(t) && t[3] === "redeemed").map((t) => t[1]);
}

/** Checks if the history contents are locked */
export function isHistoryContentLocked(history: NostrEvent): boolean {
  return isHiddenTagsLocked(history);
}

/** Returns the parsed content of a 7376 history event */
export function getHistoryContent(history: NostrEvent): HistoryContent | undefined {
  if (isHistoryContentLocked(history)) return undefined;

  return getOrComputeCachedValue(history, HistoryContentSymbol, () => {
    const tags = getHiddenTags(history);
    if (!tags) throw new Error("History event is locked");

    const direction = tags.find((t) => t[0] === "direction")?.[1] as HistoryDirection | undefined;
    if (!direction) throw new Error("History event missing direction");
    const amountStr = tags.find((t) => t[0] === "amount")?.[1];
    if (!amountStr) throw new Error("History event missing amount");
    const amount = parseInt(amountStr);
    if (!Number.isFinite(amount)) throw new Error("Failed to parse amount");

    const mint = tags.find((t) => t[0] === "mint")?.[1];
    const feeStr = tags.find((t) => t[0] === "fee")?.[1];
    const fee = feeStr ? parseInt(feeStr) : undefined;

    const created = tags.filter((t) => isETag(t) && t[3] === "created").map((t) => t[1]);

    return { direction, amount, created, mint, fee };
  });
}

/** Decrypts a wallet history event */
export async function unlockHistoryContent(history: NostrEvent, signer: HiddenContentSigner): Promise<HistoryContent> {
  if (isHiddenContentLocked(history)) await unlockHiddenTags(history, signer);
  return getHistoryContent(history)!;
}

export function lockHistoryContent(history: NostrEvent) {
  Reflect.deleteProperty(history, HistoryContentSymbol);
  lockHiddenTags(history);
}
