import { kinds } from "nostr-tools";
import { getParentEventStore, isEvent } from "./event.js";

export const EncryptedContentSymbol = Symbol.for("encrypted-content");

export interface EncryptedContentSigner {
  nip04?: {
    encrypt: (pubkey: string, plaintext: string) => Promise<string> | string;
    decrypt: (pubkey: string, ciphertext: string) => Promise<string> | string;
  };
  nip44?: {
    encrypt: (pubkey: string, plaintext: string) => Promise<string> | string;
    decrypt: (pubkey: string, ciphertext: string) => Promise<string> | string;
  };
}

/** Various event kinds that can have encrypted content and which encryption method they use */
export const EventContentEncryptionMethod: Record<number, "nip04" | "nip44"> = {
  [kinds.EncryptedDirectMessage]: "nip04",
  [kinds.Seal]: "nip44",
  [kinds.GiftWrap]: "nip44",
};

/** Sets the encryption method that is used for the contents of a specific event kind */
export function setEncryptedContentEncryptionMethod(kind: number, method: "nip04" | "nip44"): number {
  EventContentEncryptionMethod[kind] = method;
  return kind;
}

/** Returns either nip04 or nip44 encryption methods depending on event kind */
export function getEncryptedContentEncryptionMethods(kind: number, signer: EncryptedContentSigner) {
  const method = EventContentEncryptionMethod[kind];
  const encryption = signer[method];
  if (!encryption) throw new Error(`Signer does not support ${method} encryption`);

  return encryption;
}

/** Checks if an event can have encrypted content */
export function canHaveEncryptedContent(kind: number): boolean {
  return EventContentEncryptionMethod[kind] !== undefined;
}

/** Checks if an event has encrypted content */
export function hasEncryptedContent<T extends { content: string }>(event: T): boolean {
  return event.content.length > 0;
}

/** Returns the encrypted content for an event if it is unlocked */
export function getEncryptedContent<T extends object>(event: T): string | undefined {
  return Reflect.get(event, EncryptedContentSymbol) as string | undefined;
}

/** Checks if the encrypted content is locked */
export function isEncryptedContentLocked<T extends object>(event: T): boolean {
  return Reflect.has(event, EncryptedContentSymbol) === false;
}

/**
 * Unlocks the encrypted content in an event and caches it
 * @param event The event with content to decrypt
 * @param pubkey The other pubkey that encrypted the content
 * @param signer A signer to use to decrypt the content
 */
export async function unlockEncryptedContent<T extends { kind: number; content: string }>(
  event: T,
  pubkey: string,
  signer: EncryptedContentSigner,
): Promise<string> {
  const encryption = getEncryptedContentEncryptionMethods(event.kind, signer);
  const plaintext = await encryption.decrypt(pubkey, event.content);

  setEncryptedContentCache(event, plaintext);
  return plaintext;
}

/** Sets the encrypted content on an event and updates it if its part of an event store */
export function setEncryptedContentCache<T extends object>(event: T, plaintext: string) {
  Reflect.set(event, EncryptedContentSymbol, plaintext);

  // if the event has been added to an event store, notify it
  if (isEvent(event)) {
    const eventStore = getParentEventStore(event);
    if (eventStore) eventStore.update(event);
  }
}

/** Removes the encrypted content cache on an event */
export function lockEncryptedContent<T extends object>(event: T) {
  Reflect.deleteProperty(event, EncryptedContentSymbol);

  // if the event has been added to an event store, notify it
  if (isEvent(event)) {
    const eventStore = getParentEventStore(event);
    if (eventStore) eventStore.update(event);
  }
}

/** An interface that is used to cache encrypted content on events */
export interface EncryptedContentCache {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}
