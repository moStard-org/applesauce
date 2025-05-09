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
        "HiddenContactsQuery",
        "HiddenMuteQuery",
        "MailboxesQuery",
        "MultipleEventsQuery",
        "MuteQuery",
        "ProfileQuery",
        "PublicContactsQuery",
        "PublicMuteQuery",
        "ReactionsQuery",
        "ReplaceableQuery",
        "ReplaceableSetQuery",
        "RepliesQuery",
        "SearchRelays",
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
