import { isNip05, NIP05_REGEX } from "nostr-tools/nip05";

/** Returns the name and domain for a NIP-05 address */
export function parseNIP05Address(address: string): { name: string; domain: string } | null {
  const match = address.toLowerCase().match(NIP05_REGEX);
  if (!match) return null;
  const [, name = "_", domain] = match;
  return { name, domain };
}

export { isNip05, NIP05_REGEX };
