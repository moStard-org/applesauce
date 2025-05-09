import { describe, expect, it } from "vitest";
import * as exports from "../index.js";

describe("exports", () => {
  it("should export the expected functions", () => {
    expect(Object.keys(exports).sort()).toMatchInlineSnapshot(`
      [
        "ANIMATED_QR_FRAGMENTS",
        "ANIMATED_QR_INTERVAL",
        "HistoryContentSymbol",
        "TokenContentSymbol",
        "WALLET_BACKUP_KIND",
        "WALLET_HISTORY_KIND",
        "WALLET_KIND",
        "WALLET_TOKEN_KIND",
        "WalletMintsSymbol",
        "WalletPrivateKeySymbol",
        "decodeTokenFromEmojiString",
        "dumbTokenSelection",
        "encodeTokenToEmoji",
        "getHistoryContent",
        "getHistoryRedeemed",
        "getProofUID",
        "getTokenContent",
        "getTokenProofsTotal",
        "getWalletMints",
        "getWalletPrivateKey",
        "ignoreDuplicateProofs",
        "isHistoryContentLocked",
        "isTokenContentLocked",
        "isWalletLocked",
        "lockHistoryContent",
        "lockTokenContent",
        "lockWallet",
        "receiveAnimated",
        "sendAnimated",
        "unlockHistoryContent",
        "unlockTokenContent",
        "unlockWallet",
      ]
    `);
  });
});
