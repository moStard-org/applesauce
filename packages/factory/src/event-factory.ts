import { EncryptedContentSymbol, unixNow } from "applesauce-core/helpers";
import { EventTemplate, NostrEvent, UnsignedEvent } from "nostr-tools";

import { CommentBlueprint } from "./blueprints/comment.js";
import { DeleteBlueprint } from "./blueprints/delete.js";
import { NoteBlueprint } from "./blueprints/note.js";
import { ReactionBlueprint } from "./blueprints/reaction.js";
import { NoteReplyBlueprint } from "./blueprints/reply.js";
import { ShareBlueprint } from "./blueprints/share.js";
import { eventPipe } from "./helpers/pipeline.js";
import { includeClientTag } from "./operations/event/client.js";
import {
  includeReplaceableIdentifier,
  modifyTags,
  ModifyTagsOptions,
  sign,
  stamp,
  stripSignature,
  stripStamp,
  stripSymbols,
  updateCreatedAt,
} from "./operations/event/index.js";
import { EventBlueprint, EventFactoryContext, EventOperation } from "./types.js";

export type EventFactoryTemplate = {
  kind: number;
  content?: string;
  tags?: string[][];
  created_at?: number;
};

/** Wraps a set of operations with common event operations */
function wrapCommon(...operations: (EventOperation | undefined)[]): EventOperation {
  return eventPipe(
    // Remove all symbols from the event except for the encrypted content symbol
    stripSymbols([EncryptedContentSymbol]),
    // Ensure all addressable evnets have "d" tags
    includeReplaceableIdentifier(),
    // Apply operations
    ...operations,
    // Include client tag if its set in the context
    (draft, ctx) => (ctx.client ? includeClientTag(ctx.client.name, ctx.client.address)(draft, ctx) : draft),
  );
}

/** Creates an event using a template, context, and a set of operations */
export async function build(
  template: EventFactoryTemplate,
  context: EventFactoryContext,
  ...operations: (EventOperation | undefined)[]
): Promise<EventTemplate> {
  return await wrapCommon(
    stripSignature(),
    stripStamp(),
    ...operations,
  )({ created_at: unixNow(), tags: [], content: "", ...template }, context);
}

/** Creates a blueprint function with operations */
export function blueprint(kind: number, ...operations: (EventOperation | undefined)[]): EventBlueprint {
  return async (context) => await build({ kind }, context, ...operations);
}

/** Creates an event from a context and a blueprint */
export async function create<Args extends Array<any>, T extends EventTemplate | UnsignedEvent | NostrEvent>(
  context: EventFactoryContext,
  blueprintConstructor: (...args: Args) => EventBlueprint<T>,
  ...args: Args
): Promise<T> {
  return await blueprintConstructor(...args)(context);
}

/** Modifies an event using a context and a set of operations */
export async function modify(
  event: EventTemplate | UnsignedEvent | NostrEvent,
  context: EventFactoryContext,
  ...operations: (EventOperation | undefined)[]
): Promise<EventTemplate> {
  return await wrapCommon(stripSignature(), stripStamp(), updateCreatedAt(), ...operations)(event, context);
}

export class EventFactory {
  constructor(public context: EventFactoryContext = {}) {}

  /** Build an event template with operations */
  async build(template: EventFactoryTemplate, ...operations: (EventOperation | undefined)[]): Promise<EventTemplate> {
    return await build(template, this.context, ...operations);
  }

  /** Create an event from a blueprint */
  async create<Args extends Array<any>, T extends EventTemplate | UnsignedEvent | NostrEvent>(
    blueprintConstructor: (...args: Args) => EventBlueprint<T>,
    ...args: Args
  ): Promise<T> {
    return await blueprintConstructor(...args)(this.context);
  }

  /** Modify an existing event with operations and updated the created_at */
  async modify(
    draft: EventTemplate | UnsignedEvent | NostrEvent,
    ...operations: (EventOperation | undefined)[]
  ): Promise<EventTemplate> {
    return await modify(draft, this.context, ...operations);
  }

  /** Modify a lists public and hidden tags and updated the created_at */
  async modifyTags(
    event: EventTemplate | UnsignedEvent | NostrEvent,
    tagOperations?: ModifyTagsOptions,
    eventOperations?: EventOperation | (EventOperation | undefined)[],
  ): Promise<EventTemplate> {
    let eventOperationsArr: EventOperation[] = [];

    // normalize event operation arg
    if (eventOperations === undefined) eventOperationsArr = [];
    else if (typeof eventOperations === "function") eventOperationsArr = [eventOperations];
    else if (Array.isArray(eventOperations)) eventOperationsArr = eventOperations.filter((e) => !!e);

    // modify event
    return await this.modify(event, modifyTags(tagOperations), ...eventOperationsArr);
  }

  /** Attaches the signers pubkey to an event template */
  async stamp(draft: EventTemplate | UnsignedEvent): Promise<UnsignedEvent> {
    return await stamp()(draft, this.context);
  }

  /** Signs a event template with the signer */
  async sign(draft: EventTemplate | UnsignedEvent): Promise<NostrEvent> {
    return await sign()(draft, this.context);
  }

  // Helpers

  /** Creates a short text note */
  note(...args: Parameters<typeof NoteBlueprint>) {
    return this.create(NoteBlueprint, ...args);
  }

  /** Create a NIP-22 comment */
  comment(...args: Parameters<typeof CommentBlueprint>) {
    return this.create(CommentBlueprint, ...args);
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
