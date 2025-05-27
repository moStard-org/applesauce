import { Emoji, EncryptedContentSymbol, HiddenContentSymbol, unixNow } from "applesauce-core/helpers";
import { EventTemplate, NostrEvent, UnsignedEvent } from "nostr-tools";
import { isAddressableKind } from "nostr-tools/kinds";
import { AddressPointer } from "nostr-tools/nip19";

import { CommentBlueprint } from "./blueprints/comment.js";
import { DeleteBlueprint } from "./blueprints/delete.js";
import { NoteBlueprint } from "./blueprints/note.js";
import { ReactionBlueprint } from "./blueprints/reaction.js";
import { NoteReplyBlueprint } from "./blueprints/reply.js";
import { ShareBlueprint } from "./blueprints/share.js";
import { includeClientTag } from "./operations/event/client.js";
import { includeReplaceableIdentifier, modifyHiddenTags, modifyPublicTags } from "./operations/event/index.js";

export type EventFactoryTemplate = {
  kind: number;
  content?: string;
  tags?: string[][];
  created_at?: number;
};

/** A single operation in the factory process */
export type EventOperation = (
  draft: EventTemplate,
  context: EventFactoryContext,
) => EventTemplate | Promise<EventTemplate>;

/** A single operation that modifies an events public or hidden tags array */
export type TagOperation = (tags: string[][], ctx: EventFactoryContext) => string[][] | Promise<string[][]>;

/** A prebuilt event template */
export type EventBlueprint = (context: EventFactoryContext) => EventTemplate | Promise<EventTemplate>;

export type EventFactorySigner = {
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
};

export type EventFactoryClient = {
  name: string;
  address?: Omit<AddressPointer, "kind" | "relays">;
};

export type EventFactoryContext = {
  /** NIP-89 client tag */
  client?: EventFactoryClient;
  getEventRelayHint?: (event: string) => string | undefined | Promise<string> | Promise<undefined>;
  getPubkeyRelayHint?: (pubkey: string) => string | undefined | Promise<string> | Promise<undefined>;
  /** A signer used to encrypt the content of some notes */
  signer?: EventFactorySigner;
  /** An array of custom emojis that will be used in text note content */
  emojis?: Emoji[];
};

export class EventFactory {
  constructor(public context: EventFactoryContext = {}) {}

  static async runProcess(
    template: EventFactoryTemplate,
    context: EventFactoryContext,
    ...operations: (EventOperation | undefined)[]
  ): Promise<EventTemplate> {
    let draft: EventTemplate = {
      kind: template.kind,
      content: template.content ?? "",
      created_at: unixNow(),
      tags: template.tags ? Array.from(template.tags) : [],
    };

    // preserve the existing encrypted content
    if (Reflect.has(template, EncryptedContentSymbol))
      Reflect.set(draft, EncryptedContentSymbol, Reflect.get(template, EncryptedContentSymbol) as string);

    // make sure parameterized replaceable events have "d" tags
    if (isAddressableKind(draft.kind)) draft = await includeReplaceableIdentifier()(draft, context);

    // get the existing encrypted content
    let encryptedContent = Reflect.get(template, EncryptedContentSymbol) as string | undefined;

    // run operations
    for (const operation of operations) {
      if (operation) {
        draft = await operation(draft, context);

        // if the operation has set encrypted content and left the plaintext version, carry it forward
        if (Reflect.has(draft, EncryptedContentSymbol))
          encryptedContent = Reflect.get(draft, EncryptedContentSymbol) as string;
      }
    }

    // add client tag
    if (context.client) {
      draft = await includeClientTag(context.client.name, context.client.address)(draft, context);
    }

    // if there was hidden content set, carry it forward
    if (encryptedContent !== undefined) Reflect.set(draft, EncryptedContentSymbol, encryptedContent);

    return draft;
  }

  /** Build an event template with operations */
  async build(template: EventFactoryTemplate, ...operations: (EventOperation | undefined)[]): Promise<EventTemplate> {
    return await EventFactory.runProcess(template, this.context, ...operations);
  }

  /**
   * Build an event template with operations
   * @deprecated use the build method instead
   */
  async process(template: EventFactoryTemplate, ...operations: (EventOperation | undefined)[]): Promise<EventTemplate> {
    return await EventFactory.runProcess(template, this.context, ...operations);
  }

  /** Create an event from a blueprint */
  async create<Args extends Array<any>>(
    blueprint: (...args: Args) => EventBlueprint,
    ...args: Args
  ): Promise<EventTemplate> {
    return await blueprint(...args)(this.context);
  }

  /** Modify an existing event with operations and updated the created_at */
  async modify(
    draft: EventFactoryTemplate | NostrEvent,
    ...operations: (EventOperation | undefined)[]
  ): Promise<EventTemplate> {
    return await EventFactory.runProcess(draft, this.context, ...operations);
  }

  /** Modify a lists public and hidden tags and updated the created_at */
  async modifyTags(
    event: EventFactoryTemplate,
    tagOperations?:
      | TagOperation
      | TagOperation[]
      | { public?: TagOperation | TagOperation[]; hidden?: TagOperation | TagOperation[] },
    eventOperations?: EventOperation | (EventOperation | undefined)[],
  ): Promise<EventTemplate> {
    let publicTagOperations: TagOperation[] = [];
    let hiddenTagOperations: TagOperation[] = [];
    let eventOperationsArr: EventOperation[] = [];

    // normalize tag operation arg
    if (tagOperations === undefined) publicTagOperations = hiddenTagOperations = [];
    else if (Array.isArray(tagOperations)) publicTagOperations = tagOperations;
    else if (typeof tagOperations === "function") publicTagOperations = [tagOperations];
    else {
      if (typeof tagOperations.public === "function") publicTagOperations = [tagOperations.public];
      else if (tagOperations.public) publicTagOperations = tagOperations.public;

      if (typeof tagOperations.hidden === "function") hiddenTagOperations = [tagOperations.hidden];
      else if (tagOperations.hidden) hiddenTagOperations = tagOperations.hidden;
    }

    // normalize event operation arg
    if (eventOperations === undefined) eventOperationsArr = [];
    else if (typeof eventOperations === "function") eventOperationsArr = [eventOperations];
    else if (Array.isArray(eventOperations)) eventOperationsArr = eventOperations.filter((e) => !!e);

    // modify event
    return await this.modify(
      event,
      publicTagOperations.length > 0 ? modifyPublicTags(...publicTagOperations) : undefined,
      hiddenTagOperations.length > 0 ? modifyHiddenTags(...hiddenTagOperations) : undefined,
      ...eventOperationsArr,
    );
  }

  /** Attaches the signers pubkey to an event template */
  async stamp(draft: EventTemplate): Promise<UnsignedEvent> {
    if (!this.context.signer) throw new Error("Missing signer");

    // Remove old fields from signed nostr event
    Reflect.deleteProperty(draft, "id");
    Reflect.deleteProperty(draft, "sig");

    const newDraft = { ...draft, pubkey: await this.context.signer.getPublicKey() };

    // copy the plaintext hidden content if its on the draft
    if (Reflect.has(draft, HiddenContentSymbol)) {
      Reflect.set(newDraft, HiddenContentSymbol, Reflect.get(draft, HiddenContentSymbol)!);
    }

    return newDraft;
  }

  async sign(draft: EventTemplate | UnsignedEvent): Promise<NostrEvent> {
    if (!this.context.signer) throw new Error("Missing signer");
    draft = await this.stamp(draft);
    const signed = await this.context.signer.signEvent(draft);

    // copy the plaintext hidden content if its on the draft
    if (Reflect.has(draft, HiddenContentSymbol)) {
      Reflect.set(signed, HiddenContentSymbol, Reflect.get(draft, HiddenContentSymbol)!);
    }

    return signed;
  }

  // Helpers

  /** Create a NIP-22 comment */
  comment(...args: Parameters<typeof CommentBlueprint>) {
    return this.create(CommentBlueprint, ...args);
  }

  /** Creates a short text note */
  note(...args: Parameters<typeof NoteBlueprint>) {
    return this.create(NoteBlueprint, ...args);
  }

  /** Creates a short text note reply */
  noteReply(...args: Parameters<typeof NoteReplyBlueprint>) {
    return this.create(NoteReplyBlueprint, ...args);
  }

  /** Creates a reaction event */
  reaction(...args: Parameters<typeof ReactionBlueprint>) {
    return this.create(ReactionBlueprint, ...args);
  }

  /** Creates a delete event */
  delete(...args: Parameters<typeof DeleteBlueprint>) {
    return this.create(DeleteBlueprint, ...args);
  }

  /** Creates a share event */
  share(...args: Parameters<typeof ShareBlueprint>) {
    return this.create(ShareBlueprint, ...args);
  }
}
