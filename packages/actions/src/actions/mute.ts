import {
  addEventTag,
  addNameValueTag,
  addPubkeyTag,
  removeEventTag,
  removeNameValueTag,
  removePubkeyTag,
} from "applesauce-factory/operations/tag";
import { kinds, NostrEvent } from "nostr-tools";
import { EventPointer } from "nostr-tools/nip19";
import { IEventStoreRead } from "applesauce-core/event-store";

import { Action } from "../action-hub.js";

function ensureMuteList(events: IEventStoreRead, self: string) {
  const mute = events.getReplaceable(kinds.Mutelist, self);
  if (!mute) throw new Error("No mute list found");
  return mute;
}

/** An action that adds a pubkey to the mute list */
export function MuteUser(pubkey: string, hidden = false): Action {
  return async function* ({ events, factory, self }) {
    const mute = ensureMuteList(events, self);

    const operation = addPubkeyTag(pubkey);
    const draft = await factory.modifyTags(mute, hidden ? { hidden: operation } : operation);
    yield await factory.sign(draft);
  };
}

/** Removes a pubkey from the mute list */
export function UnmuteUser(pubkey: string, hidden = false): Action {
  return async function* ({ events, factory, self }) {
    const mute = ensureMuteList(events, self);

    const draft = await factory.modifyTags(
      mute,
      hidden ? { hidden: removePubkeyTag(pubkey) } : removePubkeyTag(pubkey),
    );
    yield await factory.sign(draft);
  };
}

/** Add a thread to the mute list */
export function MuteThread(thread: string | NostrEvent | EventPointer, hidden = false): Action {
  return async function* ({ events, factory, self }) {
    const mute = ensureMuteList(events, self);

    const operation = addEventTag(thread);
    const draft = await factory.modifyTags(mute, hidden ? { hidden: operation } : operation);
    yield await factory.sign(draft);
  };
}

/** Removes a thread from the mute list */
export function UnmuteThread(thread: string | NostrEvent | EventPointer, hidden = false): Action {
  return async function* ({ events, factory, self }) {
    const mute = ensureMuteList(events, self);

    const operation = removeEventTag(thread);
    const draft = await factory.modifyTags(mute, hidden ? { hidden: operation } : operation);
    yield await factory.sign(draft);
  };
}

/** Add a word to the mute list */
export function MuteWord(word: string, hidden = false): Action {
  return async function* ({ events, factory, self }) {
    const mute = ensureMuteList(events, self);

    const operation = addNameValueTag(["word", word.toLocaleLowerCase()], true);
    const draft = await factory.modifyTags(mute, hidden ? { hidden: operation } : operation);
    yield await factory.sign(draft);
  };
}

/** Removes a word from the mute list */
export function UnmuteWord(word: string, hidden = false): Action {
  return async function* ({ events, factory, self }) {
    const mute = ensureMuteList(events, self);

    const operation = removeNameValueTag(["word", word.toLocaleLowerCase()]);
    const draft = await factory.modifyTags(mute, hidden ? { hidden: operation } : operation);
    yield await factory.sign(draft);
  };
}

/** Add a hashtag to the mute list */
export function MuteHashtag(hashtag: string, hidden = false): Action {
  return async function* ({ events, factory, self }) {
    const mute = ensureMuteList(events, self);

    const operation = addNameValueTag(["t", hashtag.toLocaleLowerCase()], true);
    const draft = await factory.modifyTags(mute, hidden ? { hidden: operation } : operation);
    yield await factory.sign(draft);
  };
}

/** Removes a hashtag from the mute list */
export function UnmuteHashtag(hashtag: string, hidden = false): Action {
  return async function* ({ events, factory, self }) {
    const mute = ensureMuteList(events, self);

    const operation = removeNameValueTag(["t", hashtag.toLocaleLowerCase()]);
    const draft = await factory.modifyTags(mute, hidden ? { hidden: operation } : operation);
    yield await factory.sign(draft);
  };
}
