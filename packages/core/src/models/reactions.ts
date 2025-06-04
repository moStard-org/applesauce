import { kinds, NostrEvent } from "nostr-tools";

import { getEventUID, isReplaceable } from "../helpers/event.js";
import { Model } from "../event-store/interface.js";

/** A model that returns all reactions to an event (supports replaceable events) */
export function ReactionsModel(event: NostrEvent): Model<NostrEvent[]> {
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
