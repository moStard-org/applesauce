import { EventTemplate, kinds, NostrEvent } from "nostr-tools";

import { GROUPS_LIST_KIND } from "./groups.js";
import { EventStore } from "../event-store/event-store.js";
import { unixNow } from "./time.js";
import { isEvent } from "./event.js";

export type HiddenTagsSigner = {
  nip04?: {
    encrypt: (pubkey: string, plaintext: string) => Promise<string> | string;
    decrypt: (pubkey: string, ciphertext: string) => Promise<string> | string;
  };
  nip44?: {
    encrypt: (pubkey: string, plaintext: string) => Promise<string> | string;
    decrypt: (pubkey: string, ciphertext: string) => Promise<string> | string;
  };
};

export const HiddenTagsSymbol = Symbol.for("hidden-tags");

/** Various event kinds that can have encrypted tags in their content and which encryption method they use */
export const EventEncryptionMethod: Record<number, "nip04" | "nip44"> = {
  // NIP-60 wallet
  17375: "nip44",

  // NIP-51 lists
  [kinds.BookmarkList]: "nip04",
  [kinds.InterestsList]: "nip04",
  [kinds.Mutelist]: "nip04",
  [kinds.CommunitiesList]: "nip04",
  [kinds.PublicChatsList]: "nip04",
  [kinds.SearchRelaysList]: "nip04",
  [GROUPS_LIST_KIND]: "nip04",

  // NIP-51 sets
  [kinds.Bookmarksets]: "nip04",
  [kinds.Relaysets]: "nip04",
  [kinds.Followsets]: "nip04",
  [kinds.Curationsets]: "nip04",
  [kinds.Interestsets]: "nip04",
};

/** Checks if an event can have hidden tags */
export function canHaveHiddenTags(kind: number): boolean {
  return EventEncryptionMethod[kind] !== undefined;
}

/** Checks if an event has hidden tags */
export function hasHiddenTags(event: NostrEvent | EventTemplate): boolean {
  return canHaveHiddenTags(event.kind) && event.content.length > 0;
}

/** Returns the hidden tags for an event if they are unlocked */
export function getHiddenTags(event: NostrEvent | EventTemplate): string[][] | undefined {
  return Reflect.get(event, HiddenTagsSymbol) as string[][] | undefined;
}

/** Checks if the hidden tags are locked */
export function isHiddenTagsLocked(event: NostrEvent): boolean {
  return hasHiddenTags(event) && getHiddenTags(event) === undefined;
}

/** Returns either nip04 or nip44 encryption method depending on list kind */
export function getListEncryptionMethods(kind: number, signer: HiddenTagsSigner) {
  const method = EventEncryptionMethod[kind];
  const encryption = signer[method];
  if (!encryption) throw new Error(`Signer does not support ${method} encryption`);

  return encryption;
}

/**
 * Decrypts the private list
 * @param event The list event to decrypt
 * @param signer A signer to use to decrypt the tags
 * @param store An optional EventStore to notify about the update
 * @throws
 */
export async function unlockHiddenTags<T extends { kind: number; pubkey: string; content: string }>(
  event: T,
  signer: HiddenTagsSigner,
  store?: EventStore,
): Promise<T> {
  if (!canHaveHiddenTags(event.kind)) throw new Error("Event kind does not support hidden tags");
  const encryption = getListEncryptionMethods(event.kind, signer);
  const plaintext = await encryption.decrypt(event.pubkey, event.content);

  const parsed = JSON.parse(plaintext) as string[][];
  if (!Array.isArray(parsed)) throw new Error("Content is not an array of tags");

  // Convert array to tags array string[][]
  const tags = parsed.filter((t) => Array.isArray(t)).map((t) => t.map((v) => String(v)));

  Reflect.set(event, HiddenTagsSymbol, tags);

  if (store && isEvent(event)) store.update(event);

  return event;
}

/**
 * Override the hidden tags in an event
 * @throws
 */
export async function overrideHiddenTags(
  event: NostrEvent,
  hidden: string[][],
  signer: HiddenTagsSigner,
): Promise<EventTemplate> {
  if (!canHaveHiddenTags(event.kind)) throw new Error("Event kind does not support hidden tags");
  const encryption = getListEncryptionMethods(event.kind, signer);
  const ciphertext = await encryption.encrypt(event.pubkey, JSON.stringify(hidden));

  return {
    kind: event.kind,
    content: ciphertext,
    created_at: unixNow(),
    tags: event.tags,
  };
}
