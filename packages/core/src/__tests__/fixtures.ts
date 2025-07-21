import type { NostrEvent } from "nostr-tools";
import { finalizeEvent, generateSecretKey, getPublicKey, kinds, nip04, nip44 } from "nostr-tools";
import { EncryptedContentSigner } from "../helpers/encrypted-content.js";
import { unixNow } from "../helpers/time.js";

export class FakeUser implements EncryptedContentSigner {
  key = generateSecretKey();
  pubkey = getPublicKey(this.key);

  nip04 = {
    encrypt: (pubkey: string, plaintext: string) => nip04.encrypt(this.key, pubkey, plaintext),
    decrypt: (pubkey: string, ciphertext: string) => nip04.decrypt(this.key, pubkey, ciphertext),
  };

  nip44 = {
    encrypt: (pubkey: string, plaintext: string) =>
      nip44.encrypt(plaintext, nip44.getConversationKey(this.key, pubkey)),
    decrypt: (pubkey: string, ciphertext: string) =>
      nip44.decrypt(ciphertext, nip44.getConversationKey(this.key, pubkey)),
  };

  event(data?: Partial<NostrEvent>): NostrEvent {
    return finalizeEvent(
      {
        kind: data?.kind ?? kinds.ShortTextNote,
        content: data?.content || "",
        created_at: data?.created_at ?? unixNow(),
        tags: data?.tags || [],
      },
      this.key,
    );
  }

  note(content = "Hello World", extra?: Partial<NostrEvent>) {
    return this.event({ kind: kinds.ShortTextNote, content, ...extra });
  }

  profile(profile: any, extra?: Partial<NostrEvent>) {
    return this.event({ kind: kinds.Metadata, content: JSON.stringify({ ...profile }), ...extra });
  }
}
