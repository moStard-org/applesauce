import { VerifiedEvent } from "nostr-tools";
import { Nip07Interface } from "../nip-07.js";
import { isHexKey, normalizeToPubkey } from "applesauce-core/helpers";

/** A signer that only implements getPublicKey and throws on ever other method */
export class ReadonlySigner implements Nip07Interface {
  nip04: {
    encrypt: (pubkey: string, plaintext: string) => Promise<string> | string;
    decrypt: (pubkey: string, ciphertext: string) => Promise<string> | string;
  };
  nip44: {
    encrypt: (pubkey: string, plaintext: string) => Promise<string> | string;
    decrypt: (pubkey: string, ciphertext: string) => Promise<string> | string;
  };

  constructor(private pubkey: string) {
    if (!isHexKey(pubkey)) throw new Error("Invalid public key");

    this.nip04 = {
      encrypt: this.nip04Encrypt.bind(this),
      decrypt: this.nip04Decrypt.bind(this),
    };
    this.nip44 = {
      encrypt: this.nip44Encrypt.bind(this),
      decrypt: this.nip44Decrypt.bind(this),
    };
  }

  getPublicKey() {
    return this.pubkey;
  }
  getRelays() {
    return {};
  }

  signEvent(): VerifiedEvent {
    throw new Error("Cant sign events with readonly");
  }

  nip04Encrypt(): string {
    throw new Error("Cant encrypt with readonly");
  }
  nip04Decrypt(): string {
    throw new Error("Cant decrypt with readonly");
  }
  nip44Encrypt(): string {
    throw new Error("Cant encrypt with readonly");
  }
  nip44Decrypt(): string {
    throw new Error("Cant decrypt with readonly");
  }

  /** Creates a ReadonlySigner from a hex public key or NIP-19 npub */
  static fromPubkey(pubkey: string) {
    return new ReadonlySigner(normalizeToPubkey(pubkey));
  }
}
