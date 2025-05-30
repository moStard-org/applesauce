import { NostrEvent } from "nostr-tools";
import {
  EncryptedContentSigner,
  getEncryptedContent,
  isEncryptedContentLocked,
  lockEncryptedContent,
  unlockEncryptedContent,
} from "./encrypted-content.js";

/** Checks if a legacy direct message content is encrypted */
export function isLegacyDirectMessageLocked(event: NostrEvent): boolean {
  return isEncryptedContentLocked(event);
}

/** Returns the decrypted content of a direct message */
export async function unlockLegacyDirectMessage(message: NostrEvent, signer: EncryptedContentSigner): Promise<string> {
  const cached = getEncryptedContent(message);
  if (cached) return cached;

  // Unlock the encrypted content
  return await unlockEncryptedContent(message, message.pubkey, signer);
}

/** Clears the cached plaintext of a direct message */
export async function lockLegacyDirectMessage(message: NostrEvent) {
  lockEncryptedContent(message);
}
