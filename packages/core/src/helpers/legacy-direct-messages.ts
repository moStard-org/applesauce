import { kinds, NostrEvent } from "nostr-tools";
import {
  EncryptedContentSigner,
  getEncryptedContent,
  isEncryptedContentLocked,
  lockEncryptedContent,
  setEncryptedContentEncryptionMethod,
  unlockEncryptedContent,
} from "./encrypted-content.js";

// Enable encrypted content for legacy direct messages
setEncryptedContentEncryptionMethod(kinds.EncryptedDirectMessage, "nip04");

/** A signer interface for unlocking direct messages */
export interface LegacyDirectMessageSigner extends EncryptedContentSigner {
  getPublicKey(): Promise<string> | string;
}

/** Checks if a legacy direct message content is encrypted */
export function isLegacyDirectMessageLocked(event: NostrEvent): boolean {
  return isEncryptedContentLocked(event);
}

/** Returns the decrypted content of a direct message */
export async function unlockLegacyDirectMessage(
  message: NostrEvent,
  signer: LegacyDirectMessageSigner,
): Promise<string> {
  const cached = getEncryptedContent(message);
  if (cached) return cached;

  // Unlock the encrypted content
  return await unlockEncryptedContent(message, message.pubkey, signer);
}

/** Clears the cached plaintext of a direct message */
export async function lockLegacyDirectMessage(message: NostrEvent) {
  lockEncryptedContent(message);
}
