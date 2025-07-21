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
        "EncryptedContentModel",
        "EventModel",
        "EventsModel",
        "FavoriteRelaySetsModel",
        "FavoriteRelaysModel",
        "GiftWrapRumorModel",
        "GiftWrapsModel",
        "HiddenContactsModel",
        "HiddenMuteModel",
        "LegacyMessageReplies",
        "LegacyMessageThreads",
        "LegacyMessagesGroup",
        "LegacyMessagesGroups",
        "MailboxesModel",
        "MuteModel",
        "ProfileModel",
        "PublicContactsModel",
        "PublicMuteModel",
        "ReactionsModel",
        "ReplaceableModel",
        "ReplaceableSetModel",
        "RepliesModel",
        "SearchRelaysModel",
        "ThreadModel",
        "TimelineModel",
        "UserBlossomServersModel",
        "UserBookmarkModel",
        "UserHiddenBookmarkModel",
        "UserPinnedModel",
        "UserPublicBookmarkModel",
        "WrappedMessageReplies",
        "WrappedMessageThreads",
        "WrappedMessagesGroup",
        "WrappedMessagesGroups",
        "WrappedMessagesModel",
      ]
    `);
  });
});
