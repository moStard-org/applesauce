import { NostrEvent, VerifiedEvent, verifiedSymbol } from "nostr-tools";
import { isAddressableKind, isReplaceableKind } from "nostr-tools/kinds";
import { INDEXABLE_TAGS } from "../event-store/common.js";
import { EventStoreSymbol } from "../event-store/event-store.js";
import { IEventStore } from "../event-store/interface.js";
import { getOrComputeCachedValue } from "./cache.js";
import { getHiddenTags } from "./hidden-tags.js";

export const EventUIDSymbol = Symbol.for("event-uid");
export const ReplaceableAddressSymbol = Symbol.for("replaceable-address");
export const EventIndexableTagsSymbol = Symbol.for("indexable-tags");
export const FromCacheSymbol = Symbol.for("from-cache");
export const ReplaceableIdentifierSymbol = Symbol.for("replaceable-identifier");

/**
 * Checks if an object is a nostr event
 * NOTE: does not validation the signature on the event
 */
export function isEvent(event: any): event is NostrEvent {
  if (event === undefined || event === null) return false;

  return (
    event.id?.length === 64 &&
    typeof event.sig === "string" &&
    typeof event.pubkey === "string" &&
    event.pubkey.length === 64 &&
    typeof event.content === "string" &&
    Array.isArray(event.tags) &&
    typeof event.created_at === "number" &&
    event.created_at > 0
  );
}

/**
 * Returns if a kind is replaceable ( 10000 <= n < 20000 || n == 0 || n == 3 )
 * or parameterized replaceable ( 30000 <= n < 40000 )
 */
export function isReplaceable(kind: number) {
  return isReplaceableKind(kind) || isAddressableKind(kind);
}

/**
 * Returns the events Unique ID
 * For normal or ephemeral events this is ( event.id )
 * For replaceable events this is ( event.kind + ":" + event.pubkey + ":" )
 * For parametrized replaceable events this is ( event.kind + ":" + event.pubkey + ":" + event.tags.d )
 */
export function getEventUID(event: NostrEvent) {
  let uid = Reflect.get(event, EventUIDSymbol) as string | undefined;

  if (!uid) {
    if (isReplaceable(event.kind)) uid = getReplaceableAddress(event);
    else uid = event.id;
    Reflect.set(event, EventUIDSymbol, uid);
  }

  return uid;
}

/** Returns the replaceable event address for an addressable event */
export function getReplaceableAddress(event: NostrEvent): string {
  if (!isReplaceable(event.kind)) throw new Error("Event is not replaceable or addressable");

  return getOrComputeCachedValue(event, ReplaceableAddressSymbol, () => {
    const identifier = isAddressableKind(event.kind) ? getReplaceableIdentifier(event) : undefined;
    return createReplaceableAddress(event.kind, event.pubkey, identifier);
  });
}

/** Creates a replaceable event address from a kind, pubkey, and identifier */
export function createReplaceableAddress(kind: number, pubkey: string, identifier?: string): string {
  return kind + ":" + pubkey + ":" + (identifier ?? "");
}

/** @deprecated use createReplaceableAddress instead */
export const getReplaceableUID = createReplaceableAddress;

/** Returns a Set of tag names and values that are indexable */
export function getIndexableTags(event: NostrEvent): Set<string> {
  let indexable = Reflect.get(event, EventIndexableTagsSymbol) as Set<string> | undefined;
  if (!indexable) {
    const tags = new Set<string>();

    for (const tag of event.tags) {
      if (tag.length >= 2 && tag[0].length === 1 && INDEXABLE_TAGS.has(tag[0])) {
        tags.add(tag[0] + ":" + tag[1]);
      }
    }

    indexable = tags;
    Reflect.set(event, EventIndexableTagsSymbol, tags);
  }

  return indexable;
}

/**
 * Returns the second index ( tag[1] ) of the first tag that matches the name
 * If the event has any hidden tags they will be searched first
 */
export function getTagValue<T extends { kind: number; tags: string[][]; content: string }>(
  event: T,
  name: string,
): string | undefined {
  const hidden = getHiddenTags(event);

  const hiddenValue = hidden?.find((t) => t[0] === name)?.[1];
  if (hiddenValue) return hiddenValue;
  return event.tags.find((t) => t[0] === name)?.[1];
}

/** Sets events verified flag without checking anything */
export function fakeVerifyEvent(event: NostrEvent): event is VerifiedEvent {
  event[verifiedSymbol] = true;
  return true;
}

/** Marks an event as being from a cache */
export function markFromCache(event: NostrEvent) {
  Reflect.set(event, FromCacheSymbol, true);
}

/** Returns if an event was from a cache */
export function isFromCache(event: NostrEvent) {
  return Reflect.get(event, FromCacheSymbol) === true;
}

/** Returns the EventStore of an event if its been added to one */
export function getParentEventStore<T extends object>(event: T): IEventStore | undefined {
  return Reflect.get(event, EventStoreSymbol) as IEventStore | undefined;
}

/** Notifies the events parent store that an event has been updated */
export function notifyEventUpdate(event: NostrEvent) {
  const eventStore = getParentEventStore(event);
  if (eventStore) eventStore.update(event);
}

/**
 * Returns the replaceable identifier for a replaceable event
 * @throws
 */
export function getReplaceableIdentifier(event: NostrEvent): string {
  if (!isAddressableKind(event.kind)) throw new Error("Event is not addressable");

  return getOrComputeCachedValue(event, ReplaceableIdentifierSymbol, () => {
    const d = getTagValue(event, "d");
    if (d === undefined) throw new Error("Event missing identifier");
    return d;
  });
}

/** Checks if an event is a NIP-70 protected event */
export function isProtectedEvent(event: NostrEvent): boolean {
  return event.tags.some((t) => t[0] === "-");
}
