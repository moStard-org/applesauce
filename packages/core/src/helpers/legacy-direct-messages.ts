import { NostrEvent } from "nostr-tools";
import {
  EncryptedContentSigner,
  getEncryptedContent,
  isEncryptedContentLocked,
  lockEncryptedContent,
  unlockEncryptedContent,
} from "./encrypted-content.js";
import { getTagValue } from "./index.js";

/** Checks if a legacy direct message content is encrypted */
export function isLegacyDirectMessageLocked(event: NostrEvent): boolean {
  return isEncryptedContentLocked(event);
}

/**
 * Returns the decrypted content of a direct message
 * @param message - The message to decrypt
 * @param self - The public key of the user
 * @param signer - The signer to use to decrypt the message
 * @returns The decrypted content of the message
 */
export async function unlockLegacyDirectMessage(
  message: NostrEvent,
  self: string,
  signer: EncryptedContentSigner,
): Promise<string> {
  const cached = getEncryptedContent(message);
  if (cached) return cached;

  const corraspondant = message.pubkey === self ? getTagValue(message, "p") : message.pubkey;
  if (!corraspondant) throw new Error("No corraspondant found");

  // Unlock the encrypted content
  return await unlockEncryptedContent(message, corraspondant, signer);
}

/** Clears the cached plaintext of a direct message */
export async function lockLegacyDirectMessage(message: NostrEvent) {
  lockEncryptedContent(message);
}
