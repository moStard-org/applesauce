import { Filter, kinds, NostrEvent } from "nostr-tools";
import { map } from "rxjs";

import { Model } from "../event-store/interface.js";
import { ChannelMetadataContent, getChannelMetadataContent } from "../helpers/channels.js";
import { safeParse } from "../helpers/json.js";

/** A model that returns a map of hidden messages Map<id, reason> */
export function ChannelHiddenModel(channel: NostrEvent, authors: string[] = []): Model<Map<string, string>> {
  return (events) => {
    const hidden = new Map<string, string>();

    return events
      .filters([{ kinds: [kinds.ChannelHideMessage], "#e": [channel.id], authors: [channel.pubkey, ...authors] }])
      .pipe(
        map((event) => {
          const reason = safeParse(event.content)?.reason;
          for (const tag of event.tags) {
            if (tag[0] === "e" && tag[1]) hidden.set(tag[1], reason ?? "");
          }

          return hidden;
        }),
      );
  };
}

/** A model that returns all messages in a channel */
export function ChannelMessagesModel(channel: NostrEvent): Model<NostrEvent[]> {
  return (events) => events.timeline([{ kinds: [kinds.ChannelMessage], "#e": [channel.id] }]);
}

/** A model that returns the latest parsed metadata */
export function ChannelMetadataModel(channel: NostrEvent): Model<ChannelMetadataContent | undefined> {
  return (events) => {
    const filters: Filter[] = [
      { ids: [channel.id] },
      { kinds: [kinds.ChannelMetadata], "#e": [channel.id], authors: [channel.pubkey] },
    ];

    let latest = channel;
    return events.filters(filters).pipe(
      map((event) => {
        try {
          if (event.pubkey === latest.pubkey && event.created_at > latest.created_at) {
            latest = event;
          }

          return getChannelMetadataContent(latest);
        } catch (error) {
          return undefined;
        }
      }),
    );
  };
}

/** A model that returns a map of muted users Map<pubkey, reason> */
export function ChannelMutedModel(channel: NostrEvent, authors: string[] = []): Model<Map<string, string>> {
  return (events) => {
    const muted = new Map<string, string>();

    return events
      .filters([{ kinds: [kinds.ChannelMuteUser], "#e": [channel.id], authors: [channel.pubkey, ...authors] }])
      .pipe(
        map((event) => {
          const reason = safeParse(event.content)?.reason;
          for (const tag of event.tags) {
            if (tag[0] === "p" && tag[1]) muted.set(tag[1], reason ?? "");
          }

          return muted;
        }),
      );
  };
}
