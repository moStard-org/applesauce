import { describe, it, expect, beforeEach } from "vitest";
import { AccountManager } from "../manager.js";
import { SimpleAccount, SimpleAccountSignerData } from "../accounts/simple-account.js";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { SerializedAccount } from "../types.js";
import { bytesToHex } from "@noble/hashes/utils";

let manager: AccountManager;

beforeEach(() => {
  manager = new AccountManager();
});

describe("toJSON", () => {
  it("should return an array of serialized accounts", () => {
    manager.addAccount(SimpleAccount.fromKey(generateSecretKey()));

    manager.setAccountMetadata(manager.accounts[0], { name: "testing" });

    expect(manager.toJSON()).toEqual([
      {
        id: expect.any(String),
        type: "nsec",
        pubkey: expect.any(String),
        metadata: { name: "testing" },
        signer: { key: expect.any(String) },
      },
    ]);
  });
});

describe("fromJSON", () => {
  it("should recreate accounts", () => {
    const key = generateSecretKey();
    const json: SerializedAccount<SimpleAccountSignerData, { name: string }>[] = [
      {
        id: "custom-id",
        type: "nsec",
        pubkey: getPublicKey(key),
        metadata: { name: "testing" },
        signer: { key: bytesToHex(key) },
      },
    ];

    manager.registerType(SimpleAccount);
    manager.fromJSON(json);

    expect(manager.getAccount("custom-id")).toBeInstanceOf(SimpleAccount);
    expect(manager.getAccountForPubkey(getPublicKey(key))).toBeInstanceOf(SimpleAccount);
    expect(manager.getAccountMetadata("custom-id")).toEqual({ name: "testing" });
  });
});

describe("signer", () => {
  it("should proxy active account", async () => {
    const account = SimpleAccount.generateNew();
    manager.addAccount(account);
    manager.setActive(account);

    expect(await manager.signer.getPublicKey()).toBe(getPublicKey(account.signer.key));
  });

  it("should throw if there is no active account", async () => {
    await expect(manager.signer.getPublicKey()).rejects.toThrow("No active account");
  });
});

describe("removeAccount", () => {
  it("should clear active account if removed account was active", () => {
    const account = SimpleAccount.generateNew();
    manager.addAccount(account);
    manager.setActive(account);

    manager.removeAccount(account);

    expect(manager.active).toBeUndefined();
  });
});
