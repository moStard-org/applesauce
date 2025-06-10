import { describe, it, expect, beforeEach } from "vitest";
import { ReadonlySigner } from "../readonly-signer.js";
import { generateSecretKey, getPublicKey } from "nostr-tools";

describe("ReadonlySigner", () => {
  const testPubkey = getPublicKey(generateSecretKey());
  let signer: ReadonlySigner;

  beforeEach(() => {
    signer = new ReadonlySigner(testPubkey);
  });

  describe("getPublicKey", () => {
    it("should return the public key provided in constructor", () => {
      expect(signer.getPublicKey()).toBe(testPubkey);
    });
  });

  describe("getRelays", () => {
    it("should return an empty object", () => {
      const relays = signer.getRelays();
      expect(relays).toEqual({});
      expect(Object.keys(relays)).toHaveLength(0);
    });
  });

  describe("signEvent", () => {
    it("should throw an error when attempting to sign events", () => {
      expect(() => signer.signEvent()).toThrow("Cant sign events with readonly");
    });
  });

  describe("nip04 encryption/decryption", () => {
    it("should throw an error when attempting to encrypt via nip04.encrypt", () => {
      expect(() => signer.nip04.encrypt("pubkey", "plaintext")).toThrow("Cant encrypt with readonly");
    });

    it("should throw an error when attempting to decrypt via nip04.decrypt", () => {
      expect(() => signer.nip04.decrypt("pubkey", "ciphertext")).toThrow("Cant decrypt with readonly");
    });
  });

  describe("nip44 encryption/decryption", () => {
    it("should throw an error when attempting to encrypt via nip44.encrypt", () => {
      expect(() => signer.nip44.encrypt("pubkey", "plaintext")).toThrow("Cant encrypt with readonly");
    });

    it("should throw an error when attempting to decrypt via nip44.decrypt", () => {
      expect(() => signer.nip44.decrypt("pubkey", "ciphertext")).toThrow("Cant decrypt with readonly");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string as public key", () => {
      expect(() => new ReadonlySigner("")).toThrow("Invalid public key");
    });

    it("should handle special characters in public key", () => {
      expect(() => new ReadonlySigner("test-key-with-special-chars!@#$%")).toThrow("Invalid public key");
    });
  });
});
