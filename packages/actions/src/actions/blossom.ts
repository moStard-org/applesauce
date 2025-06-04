import { IEventStoreRead } from "applesauce-core";
import { BLOSSOM_SERVER_LIST_KIND } from "applesauce-core/helpers/blossom";
import { TagOperation } from "applesauce-factory";
import { modifyPublicTags } from "applesauce-factory/operations/event";
import { addBlossomServerTag, removeBlossomServerTag } from "applesauce-factory/operations/tag/blossom";

import { Action } from "../action-hub.js";

function getBlossomServersEvent(events: IEventStoreRead, self: string) {
  const event = events.getReplaceable(BLOSSOM_SERVER_LIST_KIND, self);
  if (!event) throw new Error("Can't find Blossom servers event");
  return event;
}

/** An action that adds a server to the Blossom servers event */
export function AddBlossomServer(server: string | URL | (string | URL)[]): Action {
  return async function* ({ events, factory, self }) {
    const servers = getBlossomServersEvent(events, self);

    const operation = Array.isArray(server) ? server.map((s) => addBlossomServerTag(s)) : addBlossomServerTag(server);

    const draft = await factory.modifyTags(servers, operation);
    yield await factory.sign(draft);
  };
}

/** An action that removes a server from the Blossom servers event */
export function RemoveBlossomServer(server: string | URL | (string | URL)[]): Action {
  return async function* ({ events, factory, self }) {
    const servers = getBlossomServersEvent(events, self);

    const operation = Array.isArray(server)
      ? server.map((s) => removeBlossomServerTag(s))
      : removeBlossomServerTag(server);

    const draft = await factory.modifyTags(servers, operation);
    yield await factory.sign(draft);
  };
}

/** Makes a specific Blossom server the default server (move it to the top of the list) */
export function SetDefaultBlossomServer(server: string | URL): Action {
  return async function* ({ events, factory, self }) {
    const servers = getBlossomServersEvent(events, self);

    const prependTag =
      (tag: string[]): TagOperation =>
      (tags) => [tag, ...tags];

    const draft = await factory.modifyTags(servers, [
      removeBlossomServerTag(server),
      prependTag(["server", String(server)]),
    ]);
    yield await factory.sign(draft);
  };
}

/** Creates a new Blossom servers event */
export function NewBlossomServers(servers?: (string | URL)[]): Action {
  return async function* ({ events, factory, self }) {
    const existing = events.getReplaceable(BLOSSOM_SERVER_LIST_KIND, self);
    if (existing) throw new Error("Blossom servers event already exists");

    const operations: TagOperation[] = servers ? servers.map((s) => addBlossomServerTag(s)) : [];

    const draft = await factory.build({ kind: BLOSSOM_SERVER_LIST_KIND }, modifyPublicTags(...operations));
    yield await factory.sign(draft);
  };
}
