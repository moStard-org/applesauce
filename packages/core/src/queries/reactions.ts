import { kinds, NostrEvent } from "nostr-tools";

import { getEventUID, isReplaceable } from "../helpers/event.js";
import { Query } from "../query-store/index.js";

/** A query that returns all reactions to an event (supports replaceable events) */
export function ReactionsQuery(event: NostrEvent): Query<NostrEvent[]> {
  return (events) =>
    events.timeline(
      isReplaceable(event.kind)
        ? [
            { kinds: [kinds.Reaction], "#e": [event.id] },
            { kinds: [kinds.Reaction], "#a": [getEventUID(event)] },
          ]
        : [
            {
              kinds: [kinds.Reaction],
              "#e": [event.id],
            },
          ],
    );
}
