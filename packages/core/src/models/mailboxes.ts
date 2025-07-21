import { kinds } from "nostr-tools";
import { map } from "rxjs/operators";

import { Model } from "../event-store/interface.js";
import { getInboxes, getOutboxes } from "../helpers/mailboxes.js";

/** A model that gets and parses the inbox and outbox relays for a pubkey */
export function MailboxesModel(pubkey: string): Model<{ inboxes: string[]; outboxes: string[] } | undefined> {
  return (events) =>
    events.replaceable(kinds.RelayList, pubkey).pipe(
      map(
        (event) =>
          event && {
            inboxes: getInboxes(event),
            outboxes: getOutboxes(event),
          },
      ),
    );
}
