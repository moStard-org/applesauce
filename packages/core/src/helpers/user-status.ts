import { NostrEvent } from "nostr-tools";
import { AddressPointer, EventPointer, ProfilePointer } from "nostr-tools/nip19";

import { getOrComputeCachedValue } from "./cache.js";
import { getAddressPointerFromATag, getEventPointerFromETag, getProfilePointerFromPTag } from "./pointers.js";

export const UserStatusPointerSymbol = Symbol.for("user-status-pointer");

export type UserStatusPointer =
  | { type: "nevent"; data: EventPointer }
  | { type: "nprofile"; data: ProfilePointer }
  | { type: "naddr"; data: AddressPointer }
  | { type: "url"; data: string };

function getStatusPointer(status: NostrEvent): UserStatusPointer | null {
  const pTag = status.tags.find((t) => t[0] === "p" && t[1]);
  if (pTag) return { type: "nprofile", data: getProfilePointerFromPTag(pTag) };

  const eTag = status.tags.find((t) => t[0] === "e" && t[1]);
  if (eTag) return { type: "nevent", data: getEventPointerFromETag(eTag) };

  const aTag = status.tags.find((t) => t[0] === "a" && t[1]);
  if (aTag) return { type: "naddr", data: getAddressPointerFromATag(aTag) };

  const rTag = status.tags.find((t) => t[0] === "r" && t[1]);
  if (rTag) return { type: "url", data: rTag[1] };

  return null;
}

/** Gets the {@link UserStatusPointer} for a status event */
export function getUserStatusPointer(status: NostrEvent) {
  return getOrComputeCachedValue(status, UserStatusPointerSymbol, () => getStatusPointer(status));
}
