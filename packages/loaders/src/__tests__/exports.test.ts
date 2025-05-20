import { describe, expect, it } from "vitest";
import * as exports from "../index.js";

describe("exports", () => {
  it("should export the expected functions", () => {
    expect(Object.keys(exports).sort()).toMatchInlineSnapshot(`
      [
        "DnsIdentityLoader",
        "Operators",
        "TagValueLoader",
        "UserSetsLoader",
        "addressPointerLoader",
        "addressPointerLoadingSequence",
        "cacheAddressPointersLoader",
        "cacheEventPointersLoader",
        "cacheTimelineLoader",
        "eventPointerLoader",
        "eventPointersLoadingSequence",
        "filterBlockLoader",
        "relayEventPointersLoader",
        "relayHintsAddressPointersLoader",
        "relayHintsEventPointersLoader",
        "relaysAddressPointersLoader",
        "relaysEventPointersLoader",
        "relaysTimelineLoader",
        "timelineLoader",
      ]
    `);
  });
});
