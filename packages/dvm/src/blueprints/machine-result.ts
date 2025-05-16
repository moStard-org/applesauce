import type { NostrEvent } from "nostr-tools";
import {
	type EventBlueprint,
	EventFactory,
	type EventOperation,
} from "applesauce-factory/event-factory";
import { setContent } from "applesauce-factory/operations/event/content";
import { includeNameValueTag } from "applesauce-factory/operations/event/tags";

// include copied "i" tags from request
function includeInputTags(request: NostrEvent): EventOperation {
	return (draft) => {
		const tags = Array.from(draft.tags);
		for (const tag of request.tags) {
			if (tag[0] === "i") tags.push(tag);
		}
		return { ...draft, tags };
	};
}

/** Build a translation result event */
export function MachineResultBlueprint(
	request: NostrEvent,
	payload: string,
): EventBlueprint {
	return (ctx) =>
		EventFactory.runProcess(
			{ kind: request.kind + 1000 },
			ctx,
			setContent(payload),
			includeInputTags(request),
			includeNameValueTag(["e", request.id]),
			includeNameValueTag(["p", request.pubkey]),
			includeNameValueTag(["request", JSON.stringify(request)]),
		);
}
