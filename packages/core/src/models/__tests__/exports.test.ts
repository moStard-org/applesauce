import { describe, expect, it } from "vitest";
import * as exports from "../index.js";

describe("exports", () => {
  it("should export the expected functions", () => {
    expect(Object.keys(exports).sort()).toMatchInlineSnapshot(`
      [
        "BlockedRelaysModel",
        "ChannelHiddenModel",
        "ChannelMessagesModel",
        "ChannelMetadataModel",
        "ChannelMutedModel",
        "CommentsModel",
        "ContactsModel",
        "EventModel",
        "EventZapsModel",
        "EventsModel",
        "FavoriteRelaySetsModel",
        "FavoriteRelaysModel",
        "GiftWrapModel",
        "HiddenContactsModel",
        "HiddenMuteModel",
        "MailboxesModel",
        "MuteModel",
        "ProfileModel",
        "PublicContactsModel",
        "PublicMuteModel",
        "ReactionsModel",
        "ReceivedZapsModel",
        "ReplaceableModel",
        "ReplaceableSetModel",
        "RepliesModel",
        "SearchRelaysModel",
        "SentZapsModel",
        "ThreadModel",
        "TimelineModel",
        "UserBlossomServersModel",
        "UserBookmarkModel",
        "UserHiddenBookmarkModel",
        "UserPinnedModel",
        "UserPublicBookmarkModel",
      ]
    `);
  });
});
