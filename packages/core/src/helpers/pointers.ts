import {
  AddressPointer,
  EventPointer,
  naddrEncode,
  ProfilePointer,
  neventEncode,
  noteEncode,
  nprofileEncode,
  npubEncode,
  nsecEncode,
  decode,
} from "nostr-tools/nip19";
import { getPublicKey, kinds, nip19, NostrEvent } from "nostr-tools";

import { getReplaceableIdentifier } from "./event.js";
import { isAddressableKind } from "nostr-tools/kinds";
import { isSafeRelayURL, mergeRelaySets } from "./relays.js";
import { isHexKey } from "./string.js";
import { hexToBytes } from "@noble/hashes/utils";

export type DecodeResult = ReturnType<typeof decode>;

export type AddressPointerWithoutD = Omit<AddressPointer, "identifier"> & {
  identifier?: string;
};

/** Parse the value of an "a" tag into an AddressPointer */
export function parseCoordinate(a: string): AddressPointerWithoutD | null;
export function parseCoordinate(a: string, requireD: false): AddressPointerWithoutD | null;
export function parseCoordinate(a: string, requireD: true): AddressPointer | null;
export function parseCoordinate(a: string, requireD: false, silent: false): AddressPointerWithoutD;
export function parseCoordinate(a: string, requireD: true, silent: false): AddressPointer;
export function parseCoordinate(a: string, requireD: true, silent: true): AddressPointer | null;
export function parseCoordinate(a: string, requireD: false, silent: true): AddressPointerWithoutD | null;
export function parseCoordinate(a: string, requireD = false, silent = true): AddressPointerWithoutD | null {
  const parts = a.split(":") as (string | undefined)[];
  const kind = parts[0] ? parseInt(parts[0]) : undefined;
  const pubkey = parts[1];
  const d = parts[2];

  if (kind === undefined) {
    if (silent) return null;
    else throw new Error("Missing kind");
  }
  if (pubkey === undefined || pubkey === "") {
    if (silent) return null;
    else throw new Error("Missing pubkey");
  }
  if (requireD && d === undefined) {
    if (silent) return null;
    else throw new Error("Missing identifier");
  }

  return {
    kind,
    pubkey,
    identifier: d,
  };
}

/** Extra a pubkey from the result of nip19.decode */
export function getPubkeyFromDecodeResult(result?: DecodeResult): string | undefined {
  if (!result) return;
  switch (result.type) {
    case "naddr":
    case "nprofile":
      return result.data.pubkey;
    case "npub":
      return result.data;
    case "nsec":
      return getPublicKey(result.data);
    default:
      return undefined;
  }
}

/** Encodes the result of nip19.decode */
export function encodeDecodeResult(result: DecodeResult) {
  switch (result.type) {
    case "naddr":
      return naddrEncode(result.data);
    case "nprofile":
      return nprofileEncode(result.data);
    case "nevent":
      return neventEncode(result.data);
    case "nsec":
      return nsecEncode(result.data);
    case "npub":
      return npubEncode(result.data);
    case "note":
      return noteEncode(result.data);
  }

  return "";
}

/**
 * Gets an EventPointer form a common "e" tag
 * @throws
 */
export function getEventPointerFromETag(tag: string[]): EventPointer {
  if (!tag[1]) throw new Error("Missing event id in tag");
  let pointer: EventPointer = { id: tag[1] };
  if (tag[2] && isSafeRelayURL(tag[2])) pointer.relays = [tag[2]];
  return pointer;
}

/**
 * Gets an EventPointer form a common "q" tag
 * @throws
 */
export function getEventPointerFromQTag(tag: string[]): EventPointer {
  if (!tag[1]) throw new Error("Missing event id in tag");
  let pointer: EventPointer = { id: tag[1] };
  if (tag[2] && isSafeRelayURL(tag[2])) pointer.relays = [tag[2]];
  if (tag[3] && tag[3].length === 64) pointer.author = tag[3];

  return pointer;
}

/**
 * Get an AddressPointer from a common "a" tag
 * @throws
 */
export function getAddressPointerFromATag(tag: string[]): AddressPointer {
  if (!tag[1]) throw new Error("Missing coordinate in tag");
  const pointer = parseCoordinate(tag[1], true, false);
  if (tag[2] && isSafeRelayURL(tag[2])) pointer.relays = [tag[2]];
  return pointer;
}

/**
 * Gets a ProfilePointer from a common "p" tag
 * @throws
 */
export function getProfilePointerFromPTag(tag: string[]): ProfilePointer {
  if (!tag[1]) throw new Error("Missing pubkey in tag");
  if (!isHexKey(tag[1])) throw new Error("Invalid pubkey");
  const pointer: ProfilePointer = { pubkey: tag[1] };
  if (tag[2] && isSafeRelayURL(tag[2])) pointer.relays = [tag[2]];
  return pointer;
}

/** Checks if a pointer is an AddressPointer */
export function isAddressPointer(pointer: DecodeResult["data"]): pointer is AddressPointer {
  return (
    typeof pointer !== "string" &&
    Reflect.has(pointer, "identifier") &&
    Reflect.has(pointer, "pubkey") &&
    Reflect.has(pointer, "kind")
  );
}

/** Checks if a pointer is an EventPointer */
export function isEventPointer(pointer: DecodeResult["data"]): pointer is EventPointer {
  return typeof pointer !== "string" && Reflect.has(pointer, "id");
}

/** Returns the coordinate string for an AddressPointer */
export function getCoordinateFromAddressPointer(pointer: AddressPointer) {
  return pointer.kind + ":" + pointer.pubkey + ":" + pointer.identifier;
}

/**
 * Returns an AddressPointer for a replaceable event
 * @throws
 */
export function getAddressPointerForEvent(event: NostrEvent, relays?: string[]): AddressPointer {
  if (!isAddressableKind(event.kind)) throw new Error("Cant get AddressPointer for non-replaceable event");

  const d = getReplaceableIdentifier(event);
  return {
    identifier: d,
    kind: event.kind,
    pubkey: event.pubkey,
    relays,
  };
}

/** Returns an EventPointer for an event */
export function getEventPointerForEvent(event: NostrEvent, relays?: string[]): EventPointer {
  return {
    id: event.id,
    kind: event.kind,
    author: event.pubkey,
    relays,
  };
}

/**
 * Returns a pointer for a given event
 * @throws
 */
export function getPointerForEvent(event: NostrEvent, relays?: string[]): DecodeResult {
  if (kinds.isAddressableKind(event.kind)) {
    return {
      type: "naddr",
      data: getAddressPointerForEvent(event, relays),
    };
  } else {
    return {
      type: "nevent",
      data: getEventPointerForEvent(event, relays),
    };
  }
}

/** Adds relay hints to a pointer object that has a relays array */
export function addRelayHintsToPointer<T extends { relays?: string[] }>(pointer: T, relays?: Iterable<string>): T {
  if (!relays) return pointer;
  else return { ...pointer, relays: mergeRelaySets(relays, pointer.relays) };
}

/** Gets the hex pubkey from any nip-19 encoded string */
export function normalizeToPubkey(str: string): string {
  if (isHexKey(str)) return str;
  else {
    const decode = nip19.decode(str);
    const pubkey = getPubkeyFromDecodeResult(decode);
    if (!pubkey) throw new Error(`Cant find pubkey in ${decode.type}`);
    return pubkey;
  }
}

/** Converts hex to nsec strings into Uint8 secret keys */
export function normalizeToSecretKey(str: string | Uint8Array): Uint8Array {
  if (str instanceof Uint8Array) return str;
  else if (isHexKey(str)) return hexToBytes(str);
  else {
    const decode = nip19.decode(str);
    if (decode.type !== "nsec") throw new Error(`Cant get secret key from ${decode.type}`);
    return decode.data;
  }
}

/**
 * Merges two event points and keeps all relays
 * @throws if the ids are different
 */
export function mergeEventPointers(a: EventPointer, b: EventPointer): EventPointer {
  if (a.id !== b.id) throw new Error("Cant merge event pointers with different ids");

  const relays = mergeRelaySets(a.relays, b.relays);
  return { id: a.id, kind: a.kind ?? b.kind, author: a.author ?? b.author, relays };
}

/**
 * Merges two address pointers and keeps all relays
 * @throws if the kinds, pubkeys, or identifiers are different
 */
export function mergeAddressPointers(a: AddressPointer, b: AddressPointer): AddressPointer {
  if (a.kind !== b.kind || a.pubkey !== b.pubkey || a.identifier !== b.identifier)
    throw new Error("Cant merge address pointers with different kinds, pubkeys, or identifiers");

  const relays = mergeRelaySets(a.relays, b.relays);
  return { ...a, relays };
}

/**
 * Merges two profile pointers and keeps all relays
 * @throws if the pubkeys are different
 */
export function mergeProfilePointers(a: ProfilePointer, b: ProfilePointer): ProfilePointer {
  if (a.pubkey !== b.pubkey) throw new Error("Cant merge profile pointers with different pubkeys");

  const relays = mergeRelaySets(a.relays, b.relays);
  return { ...a, relays };
}
