import { describe, it, expect, beforeEach } from "vitest";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { nip19 } from "nostr-tools";
import { SimpleSigner } from "applesauce-signers/signers/simple-signer";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

import { SimpleAccount } from "../simple-account.js";
import { SerializedAccount } from "../../types.js";

let testKey: Uint8Array;
let testPubkey: string;
let testNsec: string;
let testHexKey: string;

beforeEach(() => {
  testKey = generateSecretKey();
  testPubkey = getPublicKey(testKey);
  testNsec = nip19.nsecEncode(testKey);
  testHexKey = bytesToHex(testKey);
});

describe("constructor", () => {
  it("should create a SimpleAccount with the correct type", () => {
    const signer = new SimpleSigner(testKey);
    const account = new SimpleAccount(testPubkey, signer);

    expect(account.type).toBe("nsec");
    expect(account.pubkey).toBe(testPubkey);
    expect(account.signer).toBe(signer);
  });

  it("should have the correct static type", () => {
    expect(SimpleAccount.type).toBe("nsec");
  });
});

describe("toJSON", () => {
  it("should serialize account to JSON with correct structure", () => {
    const signer = new SimpleSigner(testKey);
    const account = new SimpleAccount(testPubkey, signer);
    account.id = "test-id";
    account.metadata = { name: "Test Account" };

    const json = account.toJSON();

    expect(json).toEqual({
      id: "test-id",
      type: "nsec",
      pubkey: testPubkey,
      signer: {
        key: testHexKey,
      },
      metadata: { name: "Test Account" },
    });
  });

  it("should serialize account without metadata", () => {
    const signer = new SimpleSigner(testKey);
    const account = new SimpleAccount(testPubkey, signer);
    account.id = "test-id";

    const json = account.toJSON();

    expect(json).toEqual({
      id: "test-id",
      type: "nsec",
      pubkey: testPubkey,
      signer: {
        key: testHexKey,
      },
      metadata: undefined,
    });
  });

  it("should convert private key bytes to hex in signer data", () => {
    const signer = new SimpleSigner(testKey);
    const account = new SimpleAccount(testPubkey, signer);

    const json = account.toJSON();

    expect(json.signer.key).toBe(testHexKey);
    expect(typeof json.signer.key).toBe("string");
  });
});

describe("fromJSON", () => {
  it("should deserialize JSON to SimpleAccount", () => {
    const json: SerializedAccount<any, any> = {
      id: "test-id",
      type: "nsec",
      pubkey: testPubkey,
      signer: {
        key: testHexKey,
      },
      metadata: { name: "Test Account" },
    };

    const account = SimpleAccount.fromJSON(json);

    expect(account.id).toBe("test-id");
    expect(account.type).toBe("nsec");
    expect(account.pubkey).toBe(testPubkey);
    expect(account.metadata).toEqual({ name: "Test Account" });
    expect(account.signer).toBeInstanceOf(SimpleSigner);
    expect(account.signer.key).toEqual(testKey);
  });

  it("should deserialize JSON without metadata", () => {
    const json: SerializedAccount<any, any> = {
      id: "test-id",
      type: "nsec",
      pubkey: testPubkey,
      signer: {
        key: testHexKey,
      },
    };

    const account = SimpleAccount.fromJSON(json);

    expect(account.id).toBe("test-id");
    expect(account.type).toBe("nsec");
    expect(account.pubkey).toBe(testPubkey);
    expect(account.metadata).toBeUndefined();
    expect(account.signer).toBeInstanceOf(SimpleSigner);
    expect(account.signer.key).toEqual(testKey);
  });

  it("should convert hex key back to bytes in signer", () => {
    const json: SerializedAccount<any, any> = {
      id: "test-id",
      type: "nsec",
      pubkey: testPubkey,
      signer: {
        key: testHexKey,
      },
    };

    const account = SimpleAccount.fromJSON(json);

    expect(account.signer.key).toEqual(testKey);
    expect(account.signer.key).toBeInstanceOf(Uint8Array);
  });
});

describe("fromKey", () => {
  it("should create account from hex private key", () => {
    const account = SimpleAccount.fromKey(testHexKey);

    expect(account.pubkey).toBe(testPubkey);
    expect(account.type).toBe("nsec");
    expect(account.signer).toBeInstanceOf(SimpleSigner);
    expect(account.signer.key).toEqual(testKey);
  });

  it("should create account from NIP-19 nsec", () => {
    const account = SimpleAccount.fromKey(testNsec);

    expect(account.pubkey).toBe(testPubkey);
    expect(account.type).toBe("nsec");
    expect(account.signer).toBeInstanceOf(SimpleSigner);
    expect(account.signer.key).toEqual(testKey);
  });

  it("should create account from Uint8Array private key", () => {
    const account = SimpleAccount.fromKey(testKey);

    expect(account.pubkey).toBe(testPubkey);
    expect(account.type).toBe("nsec");
    expect(account.signer).toBeInstanceOf(SimpleSigner);
    expect(account.signer.key).toEqual(testKey);
  });

  it("should derive correct public key from private key", () => {
    const account = SimpleAccount.fromKey(testKey);
    const expectedPubkey = getPublicKey(testKey);

    expect(account.pubkey).toBe(expectedPubkey);
  });

  it("should work with typed metadata", () => {
    interface TestMetadata {
      name: string;
      avatar?: string;
    }

    const account = SimpleAccount.fromKey<TestMetadata>(testKey);

    expect(account.pubkey).toBe(testPubkey);
    expect(account.type).toBe("nsec");

    // Test that metadata can be set with correct type
    account.metadata = { name: "Test" };
    expect(account.metadata?.name).toBe("Test");
  });
});

describe("generateNew", () => {
  it("should generate a new account with random key", () => {
    const account = SimpleAccount.generateNew();

    expect(account.type).toBe("nsec");
    expect(account.pubkey).toBeDefined();
    expect(account.pubkey).toHaveLength(64); // hex pubkey length
    expect(account.signer).toBeInstanceOf(SimpleSigner);
    expect(account.signer.key).toBeInstanceOf(Uint8Array);
    expect(account.signer.key).toHaveLength(32); // 32 bytes
  });

  it("should generate different accounts each time", () => {
    const account1 = SimpleAccount.generateNew();
    const account2 = SimpleAccount.generateNew();

    expect(account1.pubkey).not.toBe(account2.pubkey);
    expect(account1.signer.key).not.toEqual(account2.signer.key);
  });

  it("should generate account with valid key pair", () => {
    const account = SimpleAccount.generateNew();
    const expectedPubkey = getPublicKey(account.signer.key);

    expect(account.pubkey).toBe(expectedPubkey);
  });

  it("should work with typed metadata", () => {
    interface TestMetadata {
      name: string;
      created: Date;
    }

    const account = SimpleAccount.generateNew<TestMetadata>();

    expect(account.type).toBe("nsec");
    expect(account.pubkey).toBeDefined();

    // Test that metadata can be set with correct type
    account.metadata = { name: "Generated", created: new Date() };
    expect(account.metadata?.name).toBe("Generated");
  });
});

describe("JSON roundtrip", () => {
  it("should preserve all data through JSON serialization and deserialization", () => {
    const originalAccount = SimpleAccount.fromKey(testKey);
    originalAccount.id = "original-id";
    originalAccount.metadata = { name: "Original Account", created: new Date().toISOString() };

    const json = originalAccount.toJSON();
    const restoredAccount = SimpleAccount.fromJSON(json);

    expect(restoredAccount.id).toBe(originalAccount.id);
    expect(restoredAccount.type).toBe(originalAccount.type);
    expect(restoredAccount.pubkey).toBe(originalAccount.pubkey);
    expect(restoredAccount.metadata).toEqual(originalAccount.metadata);
    expect(restoredAccount.signer.key).toEqual(originalAccount.signer.key);
  });

  it("should handle empty metadata in roundtrip", () => {
    const originalAccount = SimpleAccount.fromKey(testKey);
    originalAccount.id = "no-metadata-id";

    const json = originalAccount.toJSON();
    const restoredAccount = SimpleAccount.fromJSON(json);

    expect(restoredAccount.id).toBe(originalAccount.id);
    expect(restoredAccount.metadata).toBeUndefined();
    expect(restoredAccount.signer.key).toEqual(originalAccount.signer.key);
  });
});
