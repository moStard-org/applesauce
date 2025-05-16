import { NostrEvent } from "nostr-tools";
import { insertEventIntoDescendingList } from "nostr-tools/utils";
import { OperatorFunction, scan } from "rxjs";

/**
 * Accumulate events into an ordered timeline
 * @note This does not remove duplicate events
 */
export function mapEventsToTimeline(): OperatorFunction<NostrEvent, NostrEvent[]> {
  return scan((timeline, event) => insertEventIntoDescendingList(timeline, event), [] as NostrEvent[]);
}
