import { hexToBytes } from "@noble/hashes/utils";
import {
  getHiddenTags,
  getOrComputeCachedValue,
  HiddenContentSigner,
  isHiddenTagsLocked,
  lockHiddenTags,
  setHiddenContentEncryptionMethod,
  unlockHiddenTags,
} from "applesauce-core/helpers";
import { NostrEvent } from "nostr-tools";

export const WALLET_KIND = 17375;
export const WALLET_BACKUP_KIND = 375;

// Enable hidden content for wallet kinds
setHiddenContentEncryptionMethod(WALLET_KIND, "nip44");
setHiddenContentEncryptionMethod(WALLET_BACKUP_KIND, "nip44");

export const WalletPrivateKeySymbol = Symbol.for("wallet-private-key");
export const WalletMintsSymbol = Symbol.for("wallet-mints");

/** Returns if a wallet is locked */
export function isWalletLocked(wallet: NostrEvent): boolean {
  return isHiddenTagsLocked(wallet);
}

/** Unlocks a wallet and returns the hidden tags */
export async function unlockWallet(wallet: NostrEvent, signer: HiddenContentSigner): Promise<string[][]> {
  return await unlockHiddenTags(wallet, signer);
}

export function lockWallet(wallet: NostrEvent) {
  Reflect.deleteProperty(wallet, WalletPrivateKeySymbol);
  Reflect.deleteProperty(wallet, WalletMintsSymbol);
  lockHiddenTags(wallet);
}

/** Returns the wallets mints */
export function getWalletMints(wallet: NostrEvent): string[] {
  return getOrComputeCachedValue(wallet, WalletMintsSymbol, () => {
    const tags = getHiddenTags(wallet);
    if (!tags) throw new Error("Wallet is locked");
    return tags.filter((t) => t[0] === "mint").map((t) => t[1]);
  });
}

/** Returns the wallets private key as a string */
export function getWalletPrivateKey(wallet: NostrEvent): Uint8Array | undefined {
  return getOrComputeCachedValue(wallet, WalletPrivateKeySymbol, () => {
    const tags = getHiddenTags(wallet);
    if (!tags) throw new Error("Wallet is locked");

    const key = tags.find((t) => t[0] === "privkey" && t[1])?.[1];
    return key ? hexToBytes(key) : undefined;
  });
}
