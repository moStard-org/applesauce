import { describe, expect, it } from "vitest";
import * as exports from "../index.js";

describe("exports", () => {
  it("should export the expected functions", () => {
    expect(Object.keys(exports).sort()).toMatchInlineSnapshot(`
      [
        "AddNutzapInfoMint",
        "AddNutzapInfoRelay",
        "CompleteSpend",
        "ConsolidateTokens",
        "CreateWallet",
        "NutzapEvent",
        "NutzapProfile",
        "ReceiveToken",
        "RemoveNutzapInfoMint",
        "RemoveNutzapInfoRelay",
        "RolloverTokens",
        "SetNutzapInfoPubkey",
        "UnlockWallet",
        "UpdateNutzapInfo",
        "WalletAddPrivateKey",
      ]
    `);
  });
});
