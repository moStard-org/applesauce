import { NostrConnectSigner, SimpleSigner } from "applesauce-signers";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

import { BaseAccount } from "../account.js";
import { SerializedAccount } from "../types.js";

export type NostrConnectAccountSignerData = {
  clientKey: string;
  remote: string;
  relays: string[];
};

/** An account type for NIP-46 signers */
export class NostrConnectAccount<Metadata extends unknown> extends BaseAccount<
  NostrConnectSigner,
  NostrConnectAccountSignerData,
  Metadata
> {
  static readonly type = "nostr-connect";

  toJSON(): SerializedAccount<NostrConnectAccountSignerData, Metadata> {
    if (!this.signer.remote) throw new Error("Cant save NostrConnectAccount when not initialized");

    return super.saveCommonFields({
      signer: {
        clientKey: bytesToHex(this.signer.signer.key),
        remote: this.signer.remote,
        relays: this.signer.relays,
      },
    });
  }

  static fromJSON<Metadata extends unknown>(
    json: SerializedAccount<NostrConnectAccountSignerData, Metadata>,
  ): NostrConnectAccount<Metadata> {
    const signer = new NostrConnectSigner({
      relays: json.signer.relays,
      pubkey: json.pubkey,
      remote: json.signer.remote,
      signer: new SimpleSigner(hexToBytes(json.signer.clientKey)),
    });

    const account = new NostrConnectAccount<Metadata>(json.pubkey, signer);
    return super.loadCommonFields(account, json);
  }
}
