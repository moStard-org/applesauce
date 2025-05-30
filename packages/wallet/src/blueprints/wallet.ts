import { blueprint } from "applesauce-factory";
import { modifyHiddenTags } from "applesauce-factory/operations/event";

import { NostrEvent } from "nostr-tools";
import { WALLET_BACKUP_KIND, WALLET_KIND } from "../helpers/wallet.js";
import { setWalletBackupContent } from "../operations/event/wallet.js";
import { setMintTags, setPrivateKeyTag } from "../operations/tag/wallet.js";

/** A blueprint to create a new 17375 wallet */
export function WalletBlueprint(mints: string[], privateKey?: Uint8Array) {
  return blueprint(
    WALLET_KIND,
    modifyHiddenTags(privateKey ? setPrivateKeyTag(privateKey) : undefined, setMintTags(mints)),
  );
}

/** A blueprint that creates a new 375 wallet backup event */
export function WalletBackupBlueprint(wallet: NostrEvent) {
  return blueprint(WALLET_BACKUP_KIND, setWalletBackupContent(wallet));
}
