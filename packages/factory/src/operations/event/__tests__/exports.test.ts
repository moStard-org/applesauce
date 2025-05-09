import { describe, expect, it } from "vitest";
import * as exports from "../index.js";

describe("exports", () => {
  it("should export the expected functions", () => {
    expect(Object.keys(exports).sort()).toMatchInlineSnapshot(`
      [
        "createTextContentOperations",
        "includeAltTag",
        "includeChannelPointerTag",
        "includeClientTag",
        "includeCommentTags",
        "includeContentEmojiTags",
        "includeContentHashtags",
        "includeDeleteTags",
        "includeGroupHTag",
        "includeGroupPreviousTags",
        "includeHashtags",
        "includeLiveStreamTag",
        "includeNameValueTag",
        "includeNoteThreadingNotifyTags",
        "includeNoteThreadingTags",
        "includePicturePostImageTags",
        "includeQuoteTags",
        "includeReactionTags",
        "includeReplaceableIdentifier",
        "includeSingletonTag",
        "modifyHiddenTags",
        "modifyPublicTags",
        "repairContentNostrLinks",
        "setContent",
        "setContentWarning",
        "setEncryptedContent",
        "setListDescription",
        "setListImage",
        "setListTitle",
        "setProfileContent",
        "setReactionContent",
        "setZapSplit",
        "tagPubkeyMentionedInContent",
        "updateProfileContent",
      ]
    `);
  });
});
