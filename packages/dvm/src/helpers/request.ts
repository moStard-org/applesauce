import type { NostrEvent } from "nostr-tools";
import { processTags } from "applesauce-core/helpers/tags";
import { getTagValue } from "applesauce-core/helpers/event-tags";
import { mergeRelaySets } from "applesauce-core/helpers/relays";

// input types
export type RequestURLInput = { type: "url"; url: string };
export type RequestTextInput = { type: "text"; text: string };
export type RequestJobInput = { type: "job"; job: string; relay?: string; marker?: string };
export type RequestEventInput = { type: "event"; event: string; relay?: string; marker?: string };

export type RequestInput = RequestURLInput | RequestTextInput | RequestJobInput | RequestEventInput;

/** Returns all the inputs for a request */
export function getRequestInputs(request: NostrEvent): RequestInput[] {
  return processTags(request.tags, (tag) => {
    if (tag[0] !== "i") return;
    switch (tag[2]) {
      case "url":
        return { type: "url", url: tag[1] } satisfies RequestURLInput;
      case "text":
        return { type: "text", text: tag[1] } satisfies RequestTextInput;
      case "job":
        return { type: "job", job: tag[1], relay: tag[3], marker: tag[4] } satisfies RequestJobInput;
      case "event":
        return { type: "event", event: tag[1], relay: tag[3], marker: tag[4] } satisfies RequestEventInput;
      default:
        return undefined;
    }
  });
}

/** Returns all the requested relays for a request */
export function getRequestRelays(event: NostrEvent): string[] {
  return mergeRelaySets(event.tags.find((t) => t[0] === "relays")?.slice(1));
}

/** Returns the requested output type for a request */
export function getRequestOutputType(event: NostrEvent): string | undefined {
  return getTagValue(event, "output");
}

/** Returns all the request params of `name` for a request */
export function getRequestParams(request: NostrEvent, name: string): string[] {
  return processTags(request.tags, (tag) => {
    if (tag[0] === "param" && tag[1] === name && tag[2]) return tag[2];
    return undefined;
  });
}

/** Returns the first request param of `name` for a request */
export function getRequestParam(request: NostrEvent, name: string): string {
  const value = getRequestParams(request, name)[0];
  if (value === undefined) throw new Error(`Missing ${name} param`);
  return value;
}
