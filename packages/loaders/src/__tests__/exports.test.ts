import { describe, expect, it } from "vitest";
import * as exports from "../index.js";

describe("exports", () => {
  it("should export the expected functions", () => {
    expect(Object.keys(exports).sort()).toMatchInlineSnapshot(`
      [
        "CacheTimelineLoader",
        "DnsIdentityLoader",
        "Loader",
        "Operators",
        "RelayTimelineLoader",
        "ReplaceableLoader",
        "SingleEventLoader",
        "TagValueLoader",
        "TimelineLoader",
        "UserSetsLoader",
        "createAddressLoader",
        "createAddressPointerLoadingSequence",
        "createPipeline",
        "loadAddressPointersFromCache",
        "loadAddressPointersFromRelayHints",
        "loadAddressPointersFromRelays",
        "loadAddressPointersFromStore",
        "triggerPipeline",
      ]
    `);
  });
});
