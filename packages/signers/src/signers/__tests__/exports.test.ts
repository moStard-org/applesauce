import { describe, expect, it } from "vitest";
import * as exports from "../index.js";

describe("exports", () => {
  it("should export the expected functions", () => {
    expect(Object.keys(exports).sort()).toMatchInlineSnapshot(`
      [
        "AmberClipboardSigner",
        "ExtensionMissingError",
        "ExtensionSigner",
        "NostrConnectMethod",
        "NostrConnectSigner",
        "PasswordSigner",
        "Permission",
        "ReadonlySigner",
        "SerialPortSigner",
        "SimpleSigner",
        "isErrorResponse",
      ]
    `);
  });
});
