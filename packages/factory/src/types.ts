import { EventTemplate, NostrEvent, UnsignedEvent } from "nostr-tools";
import { AddressPointer } from "nostr-tools/nip19";
import { Emoji } from "applesauce-core/helpers";

/** Nostr event signer */
export interface EventSigner {
  getPublicKey: () => Promise<string> | string;
  signEvent: (template: EventTemplate) => Promise<NostrEvent> | NostrEvent;
  nip04?: {
    encrypt: (pubkey: string, plaintext: string) => Promise<string> | string;
    decrypt: (pubkey: string, ciphertext: string) => Promise<string> | string;
  };
  nip44?: {
    encrypt: (pubkey: string, plaintext: string) => Promise<string> | string;
    decrypt: (pubkey: string, ciphertext: string) => Promise<string> | string;
  };
}

/** A context with optional methods for getting relay hints */
export interface RelayHintContext {
  getEventRelayHint?: (event: string) => string | undefined | Promise<string> | Promise<undefined>;
  getPubkeyRelayHint?: (pubkey: string) => string | undefined | Promise<string> | Promise<undefined>;
}

/** A context with an optional signer */
export interface EventSignerContext {
  signer?: EventSigner;
}

export interface EventFactoryClient {
  name: string;
  address?: Omit<AddressPointer, "kind" | "relays">;
}

/** A context with an optional NIP-89 app pointer */
export interface ClientPointerContext {
  client?: EventFactoryClient;
}

export interface EmojiContext {
  /** An array of custom emojis that will be used for text notes */
  emojis?: Emoji[];
}

/** All options that can be passed when building an event */
export interface EventFactoryContext extends ClientPointerContext, EventSignerContext, RelayHintContext, EmojiContext {}

/** A single operation that modifies an events public or hidden tags array */
export type Operation<I extends unknown = unknown, R extends unknown = unknown> = (
  value: I,
  context: EventFactoryContext,
) => R | Promise<R>;

/** A single operation that modifies an events public or hidden tags array */
export type TagOperation = Operation<string[][], string[][]>;

/** A single operation that modifies an event */
export type EventOperation<
  I extends EventTemplate | UnsignedEvent | NostrEvent = EventTemplate,
  R extends EventTemplate | UnsignedEvent | NostrEvent = EventTemplate,
> = Operation<I, R>;

/** A method that creates a new event based on a set of operations */
export type EventBlueprint<T extends EventTemplate | UnsignedEvent | NostrEvent = EventTemplate> = (
  context: EventFactoryContext,
) => Promise<T>;
