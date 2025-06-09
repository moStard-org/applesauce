import { describe, expect, it } from "vitest";
import * as exports from "../index.js";

describe("exports", () => {
  it("should export the expected functions", () => {
    expect(Object.keys(exports).sort()).toMatchInlineSnapshot(`
      [
        "COMMON_LIST_KINDS",
        "COMMON_SET_KINDS",
        "DnsIdentityLoader",
        "addressPointerLoadingSequence",
        "cacheAddressPointersLoader",
        "cacheEventPointersLoader",
        "cacheTagValueLoader",
        "cacheTimelineLoader",
        "createAddressLoader",
        "createReactionsLoader",
        "createSocialGraphLoader",
        "createTagValueLoader",
        "createUserListsLoader",
        "createZapsLoader",
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
        "timelineLoader",
      ]
    `);
  });
});
