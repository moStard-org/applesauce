import { Nip07Interface } from "applesauce-signers";
import { nanoid } from "nanoid";
import { BehaviorSubject } from "rxjs";
import { NostrEvent } from "nostr-tools";

import { EventTemplate, IAccount, IAccountConstructor, SerializedAccount } from "./types.js";

/** Wraps a promise in an abort signal */
function wrapInSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((res, rej) => {
    signal.throwIfAborted();
    let done = false;

    // reject promise if abort signal is triggered
    signal.addEventListener("abort", () => {
      if (!done) rej(signal.reason || undefined);
      done = true;
    });

    return promise.then(
      (v) => {
        if (!done) res(v);
        done = true;
      },
      (err) => {
        if (!done) rej(err);
        done = true;
      },
    );
  });
}

/** An error thrown when a signer is used with the wrong pubkey */
export class SignerMismatchError extends Error {}

/** A base class for all accounts */
export class BaseAccount<Signer extends Nip07Interface, SignerData, Metadata extends unknown>
  implements IAccount<Signer, SignerData, Metadata>
{
  id = nanoid(8);

  get type() {
    const cls = Reflect.getPrototypeOf(this)!.constructor as IAccountConstructor<Signer, SignerData, Metadata>;
    return cls.type;
  }

  /** Disable request queueing */
  disableQueue?: boolean;

  metadata$ = new BehaviorSubject<Metadata | undefined>(undefined);
  get metadata(): Metadata | undefined {
    return this.metadata$.value;
  }
  set metadata(metadata: Metadata) {
    this.metadata$.next(metadata);
  }

  get nip04(): Nip07Interface["nip04"] | undefined {
    if (!this.signer.nip04) return undefined;
    return {
      encrypt: (pubkey, plaintext) => {
        return this.waitForLock(() => this.signer.nip04!.encrypt(pubkey, plaintext));
      },
      decrypt: (pubkey, plaintext) => {
        return this.waitForLock(() => this.signer.nip04!.decrypt(pubkey, plaintext));
      },
    };
  }

  get nip44(): Nip07Interface["nip44"] | undefined {
    if (!this.signer.nip44) return undefined;
    return {
      encrypt: (pubkey, plaintext) => {
        return this.waitForLock(() => this.signer.nip44!.encrypt(pubkey, plaintext));
      },
      decrypt: (pubkey, plaintext) => {
        return this.waitForLock(() => this.signer.nip44!.decrypt(pubkey, plaintext));
      },
    };
  }

  constructor(
    public pubkey: string,
    public signer: Signer,
  ) {}

  // This should be overwritten by a sub class
  toJSON(): SerializedAccount<SignerData, Metadata> {
    throw new Error("Not implemented");
  }

  /** Adds the common fields to the serialized output of a toJSON method */
  protected saveCommonFields(
    json: Omit<SerializedAccount<SignerData, Metadata>, "id" | "type" | "metadata" | "pubkey">,
  ): SerializedAccount<SignerData, Metadata> {
    return { ...json, id: this.id, pubkey: this.pubkey, metadata: this.metadata, type: this.type };
  }

  /** Sets an accounts id and metadata. NOTE: This should only be used in fromJSON methods */
  static loadCommonFields<T extends IAccount>(account: T, json: SerializedAccount<any, any>): T {
    if (json.id) account.id = json.id;
    if (json.metadata) account.metadata = json.metadata;
    return account;
  }

  /** Gets the pubkey from the signer */
  getPublicKey(): string | Promise<string> {
    const result = this.signer.getPublicKey();

    if (result instanceof Promise)
      return result.then((pubkey) => {
        if (this.pubkey !== pubkey) throw new SignerMismatchError("Account signer mismatch");
        return pubkey;
      });
    else {
      if (this.pubkey !== result) throw new SignerMismatchError("Account signer mismatch");
      return result;
    }
  }

  /** sign the event and make sure its signed with the correct pubkey */
  signEvent(template: EventTemplate): Promise<NostrEvent> | NostrEvent {
    if (!Reflect.has(template, "pubkey")) Reflect.set(template, "pubkey", this.pubkey);

    return this.waitForLock(() => {
      const result = this.signer.signEvent(template);

      if (result instanceof Promise)
        return result.then((signed) => {
          if (signed.pubkey !== this.pubkey) throw new SignerMismatchError("Signer signed with wrong pubkey");
          return signed;
        });
      else {
        if (result.pubkey !== this.pubkey) throw new SignerMismatchError("Signer signed with wrong pubkey");

        return result;
      }
    });
  }

  /** Aborts all pending requests in the queue */
  abortQueue(reason: Error) {
    if (this.abort) this.abort.abort(reason);
  }

  /** internal queue */
  protected queueLength = 0;
  protected lock: Promise<any> | null = null;
  protected abort: AbortController | null = null;
  protected reduceQueue() {
    // shorten the queue
    this.queueLength--;

    // if this was the last request, remove the lock
    if (this.queueLength === 0) {
      this.lock = null;
      this.abort = null;
    }
  }
  protected waitForLock<T>(fn: () => Promise<T> | T): Promise<T> | T {
    if (this.disableQueue) return fn();

    // if there is already a pending request, wait for it
    if (this.lock && this.abort) {
      // create a new promise that runs after the lock
      const p = wrapInSignal(
        this.lock.then(() => {
          // if the abort signal is triggered, don't call the signer
          this.abort?.signal.throwIfAborted();

          return fn();
        }),
        this.abort.signal,
      );

      // set the lock the new promise that ignores errors
      this.lock = p.catch(() => {}).finally(this.reduceQueue.bind(this));
      this.queueLength++;

      return p;
    } else {
      const result = fn();

      // if the result is async, set the new lock
      if (result instanceof Promise) {
        this.abort = new AbortController();

        const p = wrapInSignal(result, this.abort.signal);

        // set the lock the new promise that ignores errors
        this.lock = p.catch(() => {}).finally(this.reduceQueue.bind(this));
        this.queueLength = 1;
      }

      return result;
    }
  }
}
