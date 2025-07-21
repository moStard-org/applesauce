import { kinds } from "nostr-tools";
import { addInboxRelay, addOutboxRelay, removeInboxRelay, removeOutboxRelay } from "applesauce-factory/operations/tag";
import { modifyPublicTags } from "applesauce-factory/operations/event";

import { Action } from "../action-hub.js";

/** An action to create a new kind 10002 relay list event */
export function CreateMailboxes(inboxes: string[], outboxes: string[]): Action {
  return async function* ({ events, factory, self }) {
    const mailboxes = events.getReplaceable(kinds.RelayList, self);
    if (mailboxes) throw new Error("Mailbox event already exists");

    const draft = await factory.build(
      { kind: kinds.RelayList },
      modifyPublicTags(...inboxes.map(addInboxRelay), ...outboxes.map(addOutboxRelay)),
    );

    const signed = await factory.sign(draft);

    yield signed;
  };
}

/** An action to add an inbox relay to the kind 10002 relay list */
export function AddInboxRelay(relay: string | string[]): Action {
  return async function* ({ events, factory, self }) {
    if (typeof relay === "string") relay = [relay];

    const mailboxes = events.getReplaceable(kinds.RelayList, self);
    const draft = mailboxes
      ? await factory.modifyTags(mailboxes, ...relay.map(addInboxRelay))
      : await factory.build({ kind: kinds.RelayList }, modifyPublicTags(...relay.map(addInboxRelay)));

    const signed = await factory.sign(draft);

    yield signed;
  };
}

/** An action to remove an inbox relay from the kind 10002 relay list */
export function RemoveInboxRelay(relay: string | string[]): Action {
  return async function* ({ events, factory, self }) {
    if (typeof relay === "string") relay = [relay];

    const mailboxes = events.getReplaceable(kinds.RelayList, self);
    if (!mailboxes) return;

    const draft = await factory.modifyTags(mailboxes, ...relay.map(removeInboxRelay));
    const signed = await factory.sign(draft);

    yield signed;
  };
}

/** An action to add an outbox relay to the kind 10002 relay list */
export function AddOutboxRelay(relay: string | string[]): Action {
  return async function* ({ events, factory, self }) {
    if (typeof relay === "string") relay = [relay];

    const mailboxes = events.getReplaceable(kinds.RelayList, self);
    const draft = mailboxes
      ? await factory.modifyTags(mailboxes, ...relay.map(addOutboxRelay))
      : await factory.build({ kind: kinds.RelayList }, modifyPublicTags(...relay.map(addOutboxRelay)));
    const signed = await factory.sign(draft);

    yield signed;
  };
}

/** An action to remove an outbox relay from the kind 10002 relay list */
export function RemoveOutboxRelay(relay: string | string[]): Action {
  return async function* ({ events, factory, self }) {
    if (typeof relay === "string") relay = [relay];

    const mailboxes = events.getReplaceable(kinds.RelayList, self);
    if (!mailboxes) return;

    const draft = await factory.modifyTags(mailboxes, ...relay.map(removeOutboxRelay));
    const signed = await factory.sign(draft);

    yield signed;
  };
}
