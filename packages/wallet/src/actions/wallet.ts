import { Action } from "applesauce-actions";

import { getWalletMints, getWalletPrivateKey, isWalletLocked, unlockWallet, WALLET_KIND } from "../helpers/wallet.js";
import { WalletBackupBlueprint, WalletBlueprint } from "../blueprints/wallet.js";
import { isTokenContentLocked, unlockTokenContent, WALLET_TOKEN_KIND } from "../helpers/tokens.js";
import { isHistoryContentLocked, unlockHistoryContent, WALLET_HISTORY_KIND } from "../helpers/history.js";

/** An action that creates a new 17375 wallet event and 375 wallet backup */
export function CreateWallet(mints: string[], privateKey?: Uint8Array): Action {
  return async function* ({ events, factory, self }) {
    const existing = events.getReplaceable(WALLET_KIND, self);
    if (existing) throw new Error("Wallet already exists");

    const wallet = await factory.sign(await factory.create(WalletBlueprint, mints, privateKey));
    const backup = await factory.sign(await factory.create(WalletBackupBlueprint, wallet));

    // publish the backup first
    yield backup;
    yield wallet;
  };
}

/**
 * Adds a private key to a wallet event
 * @throws if the wallet does not exist or is locked
 */
export function WalletAddPrivateKey(privateKey: Uint8Array): Action {
  return async function* ({ events, self, factory }) {
    const wallet = events.getReplaceable(WALLET_KIND, self);
    if (!wallet) throw new Error("Wallet does not exist");

    if (isWalletLocked(wallet)) throw new Error("Wallet is locked");
    if (getWalletPrivateKey(wallet)) throw new Error("Wallet already has a private key");

    const draft = await factory.create(WalletBlueprint, getWalletMints(wallet), privateKey);
    const signed = await factory.sign(draft);

    // create backup event for wallet
    const backup = await factory.sign(await factory.create(WalletBackupBlueprint, signed));

    // publish events
    yield backup;
    yield signed;
  };
}

/** Unlocks the wallet event and optionally the tokens and history events */
export function UnlockWallet(unlock?: { history?: boolean; tokens?: boolean }): Action {
  return async function* ({ events, self, factory }) {
    const signer = factory.context.signer;
    if (!signer) throw new Error("Missing signer");

    const wallet = events.getReplaceable(WALLET_KIND, self);
    if (!wallet) throw new Error("Wallet does not exist");

    if (isWalletLocked(wallet)) await unlockWallet(wallet, signer);

    if (unlock?.tokens) {
      const tokens = events.getTimeline({ kinds: [WALLET_TOKEN_KIND], authors: [self] });
      for (const token of tokens) if (isTokenContentLocked(token)) await unlockTokenContent(token, signer);
    }

    if (unlock?.history) {
      const history = events.getTimeline({ kinds: [WALLET_HISTORY_KIND], authors: [self] });
      for (const entry of history) if (isHistoryContentLocked(entry)) await unlockHistoryContent(entry, signer);
    }
  };
}
