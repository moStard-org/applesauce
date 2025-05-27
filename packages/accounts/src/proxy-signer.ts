import { Nip07Interface } from "applesauce-signers";
import { EventTemplate, NostrEvent } from "nostr-tools";
import { Observable } from "rxjs";

/** A signer class that proxies requests to another signer that isn't created yet */
export class ProxySigner<T extends Nip07Interface> implements Nip07Interface {
  private _signer: T | undefined;
  protected get signer(): T {
    if (!this._signer) throw new Error(this.error || "Missing signer");
    return this._signer;
  }

  get nip04() {
    if (!this.signer.nip04) throw new Error("Signer does not support nip04");
    return this.signer.nip04;
  }

  get nip44() {
    if (!this.signer.nip44) throw new Error("Signer does not support nip44");
    return this.signer.nip44;
  }

  constructor(
    protected upstream: Observable<T | undefined>,
    protected error?: string,
  ) {
    this.upstream.subscribe((signer) => (this._signer = signer));
  }

  signEvent(template: EventTemplate): Promise<NostrEvent> | NostrEvent {
    return this.signer.signEvent(template);
  }
  getPublicKey(): Promise<string> | string {
    return this.signer.getPublicKey();
  }
}
