import { describe, expect, it } from "vitest";
import * as exports from "../index.js";

describe("exports", () => {
  it("should export the expected functions", () => {
    expect(Object.keys(exports).sort()).toMatchInlineSnapshot(`
      [
        "BlockedRelays",
        "ChannelHiddenQuery",
        "ChannelMessagesQuery",
        "ChannelMetadataQuery",
        "ChannelMutedQuery",
        "CommentsQuery",
        "ContactsQuery",
        "EventZapsQuery",
        "FavoriteRelaySets",
        "FavoriteRelays",
        "GiftWrapQuery",
        "HiddenContactsQuery",
        "HiddenMuteQuery",
        "MailboxesQuery",
        "MultipleEventsQuery",
        "MuteQuery",
        "ProfileQuery",
        "PublicContactsQuery",
        "PublicMuteQuery",
        "ReactionsQuery",
        "ReceivedZapsQuery",
        "ReplaceableQuery",
        "ReplaceableSetQuery",
        "RepliesQuery",
        "SearchRelays",
        "SentZapsQuery",
        "SingleEventQuery",
        "ThreadQuery",
        "TimelineQuery",
        "UserBlossomServersQuery",
        "UserBookmarkQuery",
        "UserHiddenBookmarkQuery",
        "UserPinnedQuery",
        "UserPublicBookmarkQuery",
      ]
    `);
  });
});
