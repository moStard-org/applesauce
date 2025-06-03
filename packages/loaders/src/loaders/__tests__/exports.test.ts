import { describe, expect, it } from "vitest";
import * as exports from "../index.js";

describe("exports", () => {
  it("should export the expected functions", () => {
    expect(Object.keys(exports).sort()).toMatchInlineSnapshot(`
      [
        "COMMON_LIST_KINDS",
        "COMMON_SET_KINDS",
        "DnsIdentityLoader",
        "addressPointerLoader",
        "addressPointerLoadingSequence",
        "cacheAddressPointersLoader",
        "cacheEventPointersLoader",
        "cacheTagValueLoader",
        "cacheTimelineLoader",
        "eventPointerLoader",
        "eventPointersLoadingSequence",
        "filterBlockLoader",
        "relayEventPointersLoader",
        "relayHintsAddressPointersLoader",
        "relayHintsEventPointersLoader",
        "relaysAddressPointersLoader",
        "relaysEventPointersLoader",
        "relaysTagValueLoader",
        "relaysTimelineLoader",
        "tagValueLoader",
        "timelineLoader",
        "userListsLoader",
      ]
    `);
  });
});
