import { AddressPointerWithoutD, createReplaceableAddress, mergeRelaySets } from "applesauce-core/helpers";
import { Filter } from "nostr-tools";
import { isAddressableKind, isReplaceableKind } from "nostr-tools/kinds";

import { AddressPointer } from "nostr-tools/nip19";
import { unique } from "./array.js";

export type LoadableAddressPointer = {
  kind: number;
  pubkey: string;
  /** Optional "d" tag for paramaritized replaceable */
  identifier?: string;
  /** Relays to load from */
  relays?: string[];
  /** Ignore all forms of caching */
  force?: boolean;
};

/** Converts an array of address pointers to a filter */
export function createFilterFromAddressPointers(pointers: AddressPointerWithoutD[] | AddressPointer[]): Filter {
  const filter: Filter = {};

  filter.kinds = unique(pointers.map((p) => p.kind));
  filter.authors = unique(pointers.map((p) => p.pubkey));
  const identifiers = unique(pointers.map((p) => p.identifier).filter((d) => !!d) as string[]);
  if (identifiers.length > 0) filter["#d"] = identifiers;

  return filter;
}

/** Takes a set of address pointers, groups them, then returns filters for the groups */
export function createFiltersFromAddressPointers(pointers: AddressPointerWithoutD[]): Filter[] {
  // split the points in to two groups so they they don't mix in the filters
  const parameterizedReplaceable = pointers.filter((p) => isAddressableKind(p.kind));
  const replaceable = pointers.filter((p) => isReplaceableKind(p.kind));

  const filters: Filter[] = [];

  if (replaceable.length > 0) {
    const groups = groupAddressPointersByPubkeyOrKind(replaceable);
    filters.push(...Array.from(groups.values()).map(createFilterFromAddressPointers));
  }

  if (parameterizedReplaceable.length > 0) {
    const groups = groupAddressPointersByPubkeyOrKind(parameterizedReplaceable);
    filters.push(...Array.from(groups.values()).map(createFilterFromAddressPointers));
  }

  return filters;
}

/** Checks if a relay will understand an address pointer */
export function isLoadableAddressPointer<T extends AddressPointerWithoutD>(pointer: T): boolean {
  if (isAddressableKind(pointer.kind)) return !!pointer.identifier;
  else return isReplaceableKind(pointer.kind);
}

/** Group an array of address pointers by kind */
export function groupAddressPointersByKind(pointers: AddressPointerWithoutD[]): Map<number, AddressPointerWithoutD[]> {
  const byKind = new Map<number, AddressPointerWithoutD[]>();

  for (const pointer of pointers) {
    if (byKind.has(pointer.kind)) byKind.get(pointer.kind)!.push(pointer);
    else byKind.set(pointer.kind, [pointer]);
  }

  return byKind;
}

/** Group an array of address pointers by pubkey */
export function groupAddressPointersByPubkey(
  pointers: AddressPointerWithoutD[],
): Map<string, AddressPointerWithoutD[]> {
  const byPubkey = new Map<string, AddressPointerWithoutD[]>();

  for (const pointer of pointers) {
    if (byPubkey.has(pointer.pubkey)) byPubkey.get(pointer.pubkey)!.push(pointer);
    else byPubkey.set(pointer.pubkey, [pointer]);
  }

  return byPubkey;
}

/** Groups address pointers by kind or pubkey depending on which is most optimal */
export function groupAddressPointersByPubkeyOrKind(pointers: AddressPointerWithoutD[]) {
  const kinds = new Set(pointers.map((p) => p.kind));
  const pubkeys = new Set(pointers.map((p) => p.pubkey));

  return pubkeys.size < kinds.size ? groupAddressPointersByPubkey(pointers) : groupAddressPointersByKind(pointers);
}

export function getRelaysFromPointers(pointers: AddressPointerWithoutD[]) {
  const relays = new Set<string>();

  for (const pointer of pointers) {
    if (!pointer.relays) continue;
    for (const relay of pointer.relays) {
      relays.add(relay);
    }
  }

  return relays;
}

/** @deprecated use getReplaceableAddress instead */
export function getAddressPointerId<T extends AddressPointerWithoutD>(pointer: T): string {
  return createReplaceableAddress(pointer.kind, pointer.pubkey, pointer.identifier);
}

/** deep clone a loadable pointer to ensure its safe to modify */
function cloneLoadablePointer(pointer: LoadableAddressPointer): LoadableAddressPointer {
  const clone = { ...pointer };
  if (pointer.relays) clone.relays = [...pointer.relays];
  return clone;
}

/** deduplicates an array of address pointers and merges their relays array */
export function consolidateAddressPointers(pointers: LoadableAddressPointer[]): LoadableAddressPointer[] {
  const byId = new Map<string, LoadableAddressPointer>();

  for (const pointer of pointers) {
    const id = getAddressPointerId(pointer);
    if (byId.has(id)) {
      // duplicate, merge pointers
      const current = byId.get(id)!;

      // merge relays
      if (pointer.relays) {
        if (current.relays) current.relays = mergeRelaySets(current.relays, pointer.relays);
        else current.relays = pointer.relays;
      }

      // merge force flag
      if (pointer.force !== undefined) {
        current.force = current.force || pointer.force;
      }
    } else byId.set(id, cloneLoadablePointer(pointer));
  }

  // return consolidated pointers
  return Array.from(byId.values());
}
