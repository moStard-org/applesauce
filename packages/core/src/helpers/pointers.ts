import {
  AddressPointer,
  DecodeResult,
  EventPointer,
  naddrEncode,
  neventEncode,
  noteEncode,
  nprofileEncode,
  npubEncode,
  nsecEncode,
  ProfilePointer,
} from "nostr-tools/nip19";
import { getPublicKey, kinds, NostrEvent } from "nostr-tools";

import { getReplaceableIdentifier } from "./event.js";
import { isAddressableKind } from "nostr-tools/kinds";
import { isSafeRelayURL } from "./relays.js";
import { isHexKey } from "./string.js";

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
 * Gets an EventPointer form a "q" tag
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
 * Get an AddressPointer from an "a" tag
 * @throws
 */
export function getAddressPointerFromATag(tag: string[]): AddressPointer {
  if (!tag[1]) throw new Error("Missing coordinate in tag");
  const pointer = parseCoordinate(tag[1], true, false);
  if (tag[2] && isSafeRelayURL(tag[2])) pointer.relays = [tag[2]];
  return pointer;
}

/**
 * Gets a ProfilePointer from a "p" tag
 * @throws
 */
export function getProfilePointerFromPTag(tag: string[]): ProfilePointer {
  if (!tag[1]) throw new Error("Missing pubkey in tag");
  if (!isHexKey(tag[1])) throw new Error("Invalid pubkey");
  const pointer: ProfilePointer = { pubkey: tag[1] };
  if (tag[2] && isSafeRelayURL(tag[2])) pointer.relays = [tag[2]];
  return pointer;
}

/** Parses "e", "a", "p", and "q" tags into a pointer */
export function getPointerFromTag(tag: string[]): DecodeResult | null {
  try {
    switch (tag[0]) {
      case "e":
        return { type: "nevent", data: getEventPointerFromETag(tag) };

      case "a":
        return {
          type: "naddr",
          data: getAddressPointerFromATag(tag),
        };

      case "p":
        return { type: "nprofile", data: getProfilePointerFromPTag(tag) };

      // NIP-18 quote tags
      case "q":
        return { type: "nevent", data: getEventPointerFromETag(tag) };
    }
  } catch (error) {}

  return null;
}

export function isAddressPointer(pointer: DecodeResult["data"]): pointer is AddressPointer {
  return (
    typeof pointer !== "string" &&
    Reflect.has(pointer, "identifier") &&
    Reflect.has(pointer, "pubkey") &&
    Reflect.has(pointer, "kind")
  );
}
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

/**
 * Returns an EventPointer for an event
 * @throws
 */
export function getEventPointerForEvent(event: NostrEvent, relays?: string[]): EventPointer {
  return {
    id: event.id,
    kind: event.kind,
    author: event.pubkey,
    relays,
  };
}

/** Returns a pointer for a given event */
export function getPointerForEvent(event: NostrEvent, relays?: string[]): DecodeResult {
  if (kinds.isAddressableKind(event.kind)) {
    const d = getReplaceableIdentifier(event);

    return {
      type: "naddr",
      data: {
        identifier: d,
        kind: event.kind,
        pubkey: event.pubkey,
        relays,
      },
    };
  } else {
    return {
      type: "nevent",
      data: {
        id: event.id,
        kind: event.kind,
        author: event.pubkey,
        relays,
      },
    };
  }
}
