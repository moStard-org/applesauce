import { describe, expect, it } from "vitest";
import { getParsedContent } from "../content.js";
import { galleries } from "../gallery.js";
import { links } from "../links.js";

describe("gallery", () => {
  it("should group image urls into galleries", () => {
    expect(
      getParsedContent("Hello https://example.com/image.png https://example.com/image2.png", undefined, [
        links,
        galleries,
      ]).children,
    ).toEqual([
      expect.objectContaining({ type: "text" }),
      expect.objectContaining({
        type: "gallery",
        links: ["https://example.com/image.png", "https://example.com/image2.png"],
      }),
    ]);
  });

  it("should not match a single image link", () => {
    expect(getParsedContent("Hello https://example.com/image.png", undefined, [links, galleries]).children).toEqual([
      expect.objectContaining({ type: "text" }),
      expect.objectContaining({ type: "link" }),
    ]);
  });

  it("should match multiple galleries", () => {
    expect(
      getParsedContent(
        "Hello https://example.com/image.png\nhttps://example.com/image2.png\n\nAnd here are the other images https://example.com/image3.png\n\nhttps://example.com/image4.png",
        undefined,
        [links, galleries],
      ).children,
    ).toEqual([
      expect.objectContaining({ type: "text" }),
      expect.objectContaining({
        type: "gallery",
        links: ["https://example.com/image.png", "https://example.com/image2.png"],
      }),
      expect.objectContaining({ type: "text" }),
      expect.objectContaining({
        type: "gallery",
        links: ["https://example.com/image3.png", "https://example.com/image4.png"],
      }),
    ]);
  });
});
