import type { NostrEvent } from "nostr-tools";
import {
	type EventBlueprint,
	EventFactory,
} from "applesauce-factory/event-factory";
import { setContent } from "applesauce-factory/operations/event/content";
import {
	includeNameValueTag,
	includeSingletonTag,
} from "applesauce-factory/operations/event/tags";

import { DVM_STATUS_KIND } from "../helpers/kinds.js";
import { JobStatus } from "../helpers/status.js";

/** A blueprint for a simple machine status event */
export function MachineStatusBlueprint(
	request: NostrEvent,
	message: string,
	status: JobStatus,
): EventBlueprint {
	return (ctx) =>
		EventFactory.runProcess(
			{ kind: DVM_STATUS_KIND },
			ctx,
			setContent(message),
			includeSingletonTag(["status", status]),
			includeNameValueTag(["e", request.id]),
			includeNameValueTag(["p", request.pubkey]),
		);
}

/** A blueprint for a payment-required status event */
export function MachinePaymentStatusBlueprint(
	request: NostrEvent,
	// amount: number,
	options?: { message?: string },
): EventBlueprint {
	return (ctx) =>
		EventFactory.runProcess(
			{ kind: DVM_STATUS_KIND },
			ctx,
			setContent(options?.message ?? "Payment required"),
			includeSingletonTag(["status", JobStatus.PAYMENT]),
			// includeSingletonTag(
			//   ["amount", String(amount), ].filter(Boolean) as [
			//     string,
			//     ...string[],
			//   ],
			// ),
			includeNameValueTag(["e", request.id]),
			includeNameValueTag(["p", request.pubkey]),
		);
}
