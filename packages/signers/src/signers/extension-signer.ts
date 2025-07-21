import { EventTemplate, VerifiedEvent, verifyEvent } from "nostr-tools";
import { ISigner } from "../interface.js";

/** AN error that is throw when the window.nostr extension is missing */
export class ExtensionMissingError extends Error {}

/** A signer that is a proxy for window.nostr */
export class ExtensionSigner implements ISigner {
  get nip04() {
    return window.nostr?.nip04;
  }
  get nip44() {
    return window.nostr?.nip44;
  }

  protected pubkey: string | undefined = undefined;

  async getPublicKey() {
    if (!window.nostr) throw new ExtensionMissingError("Signer extension missing");
    if (this.pubkey) return this.pubkey;

    this.pubkey = await window.nostr.getPublicKey();
    return this.pubkey;
  }

  async signEvent(template: EventTemplate): Promise<VerifiedEvent> {
    if (!window.nostr) throw new ExtensionMissingError("Signer extension missing");
    const event = await window.nostr.signEvent(template);
    if (!verifyEvent(event)) throw new Error("Extension returned an invalid event");
    return event;
  }
}
