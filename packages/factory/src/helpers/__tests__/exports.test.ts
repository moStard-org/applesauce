import { describe, expect, it } from "vitest";
import * as exports from "../index.js";

describe("exports", () => {
  it("should export the expected functions", () => {
    expect(Object.keys(exports).sort()).toMatchInlineSnapshot(`
      [
        "createATagFromAddressPointer",
        "createCommentTagsForEvent",
        "createCommentTagsFromCommentPointer",
        "createETagFromEventPointer",
        "createETagWithMarkerFromEventPointer",
        "createGroupHTagFromGroupPointer",
        "createGroupTagFromGroupPointer",
        "createPTagFromProfilePointer",
        "createQTagFromEventPointer",
        "ensureAddressPointerTag",
        "ensureEventPointerTag",
        "ensureKTag",
        "ensureMarkedAddressPointerTag",
        "ensureMarkedEventPointerTag",
        "ensureNamedValueTag",
        "ensureProfilePointerTag",
        "ensureQuoteEventPointerTag",
        "ensureSingletonTag",
        "fillAndTrimTag",
        "getContentPointers",
        "identity",
        "pipe",
        "pipeFromAsyncArray",
        "skip",
        "tagPipeline",
      ]
    `);
  });
});
