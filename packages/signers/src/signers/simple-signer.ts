import { normalizeToSecretKey } from "applesauce-core/helpers";
import { EventTemplate, finalizeEvent, generateSecretKey, getPublicKey, nip04, nip44 } from "nostr-tools";

/** A Simple NIP-07 signer class */
export class SimpleSigner {
  key: Uint8Array;
  constructor(key?: Uint8Array) {
    this.key = key || generateSecretKey();
  }

  async getPublicKey() {
    return getPublicKey(this.key);
  }
  async signEvent(event: EventTemplate) {
    return finalizeEvent(event, this.key);
  }

  nip04 = {
    encrypt: async (pubkey: string, plaintext: string) => nip04.encrypt(this.key, pubkey, plaintext),
    decrypt: async (pubkey: string, ciphertext: string) => nip04.decrypt(this.key, pubkey, ciphertext),
  };
  nip44 = {
    encrypt: async (pubkey: string, plaintext: string) =>
      nip44.v2.encrypt(plaintext, nip44.v2.utils.getConversationKey(this.key, pubkey)),
    decrypt: async (pubkey: string, ciphertext: string) =>
      nip44.v2.decrypt(ciphertext, nip44.v2.utils.getConversationKey(this.key, pubkey)),
  };

  /** Creates a SimpleSigner from a hex private key or NIP-19 nsec */
  static fromKey(privateKey: Uint8Array | string) {
    return new SimpleSigner(normalizeToSecretKey(privateKey));
  }
}
