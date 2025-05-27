import { describe, expect, it } from "vitest";
import * as exports from "../index.js";

describe("exports", () => {
  it("should export the expected functions", () => {
    expect(Object.keys(exports).sort()).toMatchInlineSnapshot(`
      [
        "ChannelMessageBlueprint",
        "ChannelMessageReplyBlueprint",
        "CommentBlueprint",
        "DeleteBlueprint",
        "FileMetadataBlueprint",
        "FollowSetBlueprint",
        "GiftWrapBlueprint",
        "GroupMessageBlueprint",
        "LegacyDirectMessageBlueprint",
        "LiveChatMessageBlueprint",
        "NoteBlueprint",
        "NoteReplyBlueprint",
        "PicturePostBlueprint",
        "ReactionBlueprint",
      ]
    `);
  });
});
