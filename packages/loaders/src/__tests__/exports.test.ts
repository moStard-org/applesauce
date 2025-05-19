import { describe, expect, it } from "vitest";
import * as exports from "../index.js";

describe("exports", () => {
  it("should export the expected functions", () => {
    expect(Object.keys(exports).sort()).toMatchInlineSnapshot(`
      [
        "DnsIdentityLoader",
        "Operators",
        "SingleEventLoader",
        "TagValueLoader",
        "UserSetsLoader",
        "addressLoader",
        "addressPointerLoadingSequence",
        "cacheAddressPointersLoader",
        "cacheTimelineLoader",
        "eventStoreTimelineLoader",
        "filterBlockLoader",
        "relayHintsAddressPointersLoader",
        "relaysAddressPointersLoader",
        "relaysTimelineLoader",
        "timelineLoader",
      ]
    `);
  });
});
