import { describe, expect, it } from "vitest";
import { getParsedContent } from "../content.js";
import { hashtags } from "../hashtag.js";
import { FakeUser } from "../../__tests__/fake-user.js";

const user = new FakeUser();

describe("hashtags", () => {
  it("should match all hashtags if event is missing", () => {
    expect(getParsedContent("Hello #hashtag", undefined, [hashtags]).children).toMatchInlineSnapshot(`
      [
        {
          "type": "text",
          "value": "Hello ",
        },
        {
          "hashtag": "hashtag",
          "name": "hashtag",
          "tag": undefined,
          "type": "hashtag",
        },
      ]
    `);
  });

  describe("with event", () => {
    it("should match all hashtags", () => {
      expect(
        getParsedContent(user.event({ content: "Hello #hashtag", tags: [["t", "hashtag"]] }), undefined, [hashtags])
          .children,
      ).toMatchInlineSnapshot(`
        [
          {
            "type": "text",
            "value": "Hello ",
          },
          {
            "hashtag": "hashtag",
            "name": "hashtag",
            "tag": [
              "t",
              "hashtag",
            ],
            "type": "hashtag",
          },
        ]
      `);
    });

    it("should not match hashtags with missing t tags", () => {
      expect(
        getParsedContent(user.event({ content: "Hello #hashtag", tags: [] }), undefined, [hashtags]).children,
      ).not.toEqual(expect.arrayContaining([expect.objectContaining({ type: "hashtag" })]));
    });
  });
});
